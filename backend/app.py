from fastapi import FastAPI, WebSocket, WebSocketDisconnect
import redis
import uuid
import asyncio
from helper import *
import json
import random
import os
from yaml import safe_load, YAMLError
import time
import logging

# Objective: Create a quizlet/kahoot like game where users can join a game and answer questions.
# Create game will create a game code and store it in the redis database
# Create game will also create a websocket server that will allow users to join the game and the game starter to see the metrics of each user

# Join game will allow users to join the game with the game code
# As soon as they join, they will wait until the game is started
# Once the game starts, they will receive random questions form the question bank
# If they get it correct, they'll get points and get a new question
# If they get it wrong they can earn half the points by getting it right after receiving a hint using an LLM AI model walking them through it
# The game will end after the time limit is reached
# The game starter will be able to see live metrics from the users based on their responses sent over websocket

# Define matchmaking server

app = FastAPI()

client = redis.Redis("redis", port=6379, db=0)

id_to_websocket = {}

# Create a creategame endpoint
@app.post("/creategame")
async def create_game():
    game_code = str(uuid.uuid4())[:5].upper()
    quiz_source = random.choice(os.listdir("quizzes"))
    yaml = None
    try:
        with open(f"quizzes/{quiz_source}", "r") as file:
            quiz_yml = safe_load(file)
    except YAMLError as exc:
        logging.info("Unable to load yaml file", exc)

    except FileNotFoundError:
        logging.info("Quiz file not found")

    
    if quiz_yml is None:
        return {"message": "Error loading quiz file"}

    questions = quiz_yml["questions"]
    game_data = {
        "code": game_code,
        "players": {},
        "status": "waiting",
        "questions": questions,
        "start_time": None
    }

    client.set(f"game:{game_code}", json.dumps(game_data))
    return {"game_code": game_code, "message": "Game created successfully"}

@app.post("/joingame/{game_code}")
async def join_game(game_code: str, player_name: str):
    game_data_bytes = client.get(f"game:{game_code}")
    if game_data_bytes is None:
        return {"message": "Game not found"}

    game_data = json.loads(game_data_bytes)

    # Player data to map the player
    player_data = {
        "id": str(uuid.uuid4()),
        "score": 0,
        "questions_answered": []
    }

    game_data["players"][player_name] = player_data
    client.set(f"game:{game_code}", json.dumps(game_data))

    # Logging the updated game data
    logging.info(f"Player '{player_name}' added to game '{game_code}'. Updated game data: {game_data}")

    return {"message": "Joined game", "game_code": game_code, "player_name": player_name}


@app.websocket("/ws/game/{game_code}/{player_name}")
async def game_websocket(websocket: WebSocket, game_code: str, player_name: str):
    await websocket.accept()
    logging.info(f"WebSocket connection established for player '{player_name}' in game '{game_code}'")

    # Fetch initial game data from Redis
    game_data_bytes = client.get(f"game:{game_code}")
    if game_data_bytes is None:
        await websocket.send_text("Game not found")
        await websocket.close()
        logging.info(f"Closing WebSocket for player '{player_name}' - game not found.")
        return

    game_data = json.loads(game_data_bytes)
    logging.info(f"Loaded game data for game '{game_code}': {game_data}")

    # Verify if player is part of the game
    # log players
    if player_name not in game_data["players"]:
        logging.warning(f"Player '{player_name}' not found in game '{game_code}', retrying.")
        await asyncio.sleep(0.5)
        game_data_bytes = client.get(f"game:{game_code}")
        game_data = json.loads(game_data_bytes) if game_data_bytes else None
        if not game_data or player_name not in game_data["players"]:
            await websocket.send_text("You are not a part of this game")
            await websocket.close()
            logging.info(f"Closing WebSocket for player '{player_name}' - not a part of game '{game_code}'.")
            return

    # Register player WebSocket in id_to_websocket for broadcasting
    id_to_websocket[game_data["players"][player_name]["id"]] = websocket
    client.set(f"game:{game_code}", json.dumps(game_data))
    logging.info(f"Player '{player_name}' registered in game '{game_code}'")

    # Wait for game to start
    await websocket.send_text("Waiting for game to start")
    while True:
        game_data_bytes = client.get(f"game:{game_code}")
        if game_data_bytes:
            game_data = json.loads(game_data_bytes)
            if game_data["status"] == "started":
                await websocket.send_text("The game has started!")
                logging.info(f"Player '{player_name}' notified of game start for game '{game_code}'")
                break
        await asyncio.sleep(0.5)

    # Task for handling game interruptions (e.g., pause, end)
    async def handle_interrupts():
        try:
            while True:
                game_data_bytes = client.get(f"game:{game_code}")
                if game_data_bytes:
                    game_data = json.loads(game_data_bytes)
                    if game_data["status"] == "paused":
                        await websocket.send_text("Game is paused.")
                        logging.info(f"Player '{player_name}' notified of game pause.")
                        while game_data["status"] == "paused":
                            await asyncio.sleep(0.5)
                            game_data_bytes = client.get(f"game:{game_code}")
                            game_data = json.loads(game_data_bytes) if game_data_bytes else game_data
                        await websocket.send_text("Game has resumed.")
                        logging.info(f"Player '{player_name}' notified of game resume.")
                    elif game_data["status"] == "ended":
                        await websocket.send_text("Game has ended.")
                        logging.info(f"Player '{player_name}' notified of game end.")
                        break
                await asyncio.sleep(1)
        except WebSocketDisconnect:
            logging.info(f"{player_name} disconnected during interrupt handling.")
        finally:
            logging.info(f"Interrupt task completed for player '{player_name}'.")

    # Task for handling game questions and receiving answers
    async def handle_questions():
        questions_already_answered = game_data["players"][player_name]["questions_answered"]
        try:
            while True:
                question = await get_random_question(client, questions_already_answered, game_code)

                if question is None:
                    await websocket.send_text("You've answered all the questions!")
                    logging.info(f"Player '{player_name}' has answered all questions.")
                    break

                await websocket.send_text(json.dumps(question))
                logging.info(f"Sent question to player '{player_name}': {question}")

                answer = await websocket.receive_text()
                logging.info(f"Received answer from player '{player_name}': {answer}")
                is_correct = check_answer(client, question, answer, game_code)

                if is_correct:
                    points = 100
                    await update_score(game_code, player_name, points=points)
                    await websocket.send_text(f"Correct! +{points} points")
                    logging.info(f"Player '{player_name}' answered correctly. Points awarded: {points}")
                else:
                    await websocket.send_text("Incorrect! Here's some help")
                    hint = get_hint(question)
                    await websocket.send_text(hint)
                    logging.info(f"Sent hint to player '{player_name}' for question: {question}")

                    second_attempt = await websocket.receive_text()
                    if check_answer(client, question, second_attempt, game_code):
                        await update_score(game_code, player_name, points=points/2)
                        await websocket.send_text(f"Correct! +{points/2} points")
                        logging.info(f"Player '{player_name}' answered correctly on second attempt. Points awarded: {points/2}")
                    else:
                        await websocket.send_text("Incorrect! Better luck next time")
                        logging.info(f"Player '{player_name}' failed second attempt for question: {question}")
        except WebSocketDisconnect:
            await handle_disconnect(game_code, player_name)
            logging.info(f"Player '{player_name}' disconnected during question handling.")
        finally:
            logging.info(f"Question handling task completed for player '{player_name}'.")

    # Run both tasks concurrently
    interrupt_task = asyncio.create_task(handle_interrupts())
    question_task = asyncio.create_task(handle_questions())

    # Wait for either task to complete (game ending will break the interrupt task)
    done, pending = await asyncio.wait([interrupt_task, question_task], return_when=asyncio.FIRST_COMPLETED)
    
    # Log which task completed
    for task in done:
        logging.info(f"Task completed: {task}")
    for task in pending:
        task.cancel()
        logging.info(f"Canceled pending task: {task}")

    # Close the WebSocket connection
    await websocket.close()
    logging.info(f"WebSocket connection closed for player '{player_name}' in game '{game_code}'")




@app.websocket("/ws/host/{game_code}")
async def host_websocket(websocket: WebSocket, game_code: str):
    await websocket.accept()
    logging.info("Host joined")

    # Fetch game data from Redis
    game_data_bytes = client.get(f"game:{game_code}")
    if game_data_bytes is None:
        await websocket.send_text("Game not found")
        await websocket.close()
        return

    game_data = json.loads(game_data_bytes)

    # Initial command prompt for the host to start the game
    await websocket.send_text("Type 'start' to begin the game")

    try:
        while True:
            # Wait for a command from the host
            command = await websocket.receive_text()
            command = command.lower()
            
            if command == "start" and game_data["status"] == "waiting":
                game_data["status"] = "started"
                game_data["start_time"] = time.time()
                client.set(f"game:{game_code}", json.dumps(game_data))
                await websocket.send_text("Game has started.")
                logging.info("Game started by host.")
            
            elif command == "pause" and game_data["status"] == "started":
                game_data["status"] = "paused"
                client.set(f"game:{game_code}", json.dumps(game_data))
                await websocket.send_text("Game has been paused.")
                logging.info("Game paused by host.")
            
            elif command == "resume" and game_data["status"] == "paused":
                game_data["status"] = "started"
                client.set(f"game:{game_code}", json.dumps(game_data))
                await websocket.send_text("Game has resumed.")
                logging.info("Game resumed by host.")
            
            elif command == "end":
                game_data["status"] = "ended"
                client.set(f"game:{game_code}", json.dumps(game_data))
                await websocket.send_text("Game has ended.")
                logging.info("Game ended by host.")
                break  # Exit the loop and close the WebSocket
            
            else:
                # Handle invalid commands or commands inappropriate for the current game status
                await websocket.send_text("Invalid command or inappropriate command for the current game state.")

    except WebSocketDisconnect:
        logging.info("Host disconnected")
    
    # Cleanup after the game has ended or the host has disconnected
    await websocket.close()
    logging.info("Host WebSocket connection closed.")


@app.websocket("/ws/metrics/{game_code}")
async def metrics_websocket(websocket: WebSocket, game_code: str):
    await websocket.accept()
    try:
        while True:
            metrics = await get_game_metrics(game_code)
            await websocket.send_json(metrics)
            await asyncio.sleep(1)
    except WebSocketDisconnect:
        logging.info("Game-starter disconnected from metrics")
