from fastapi import FastAPI, WebSocket
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

    # Player name is the key to map the player for now
    player_data = {
            "id": str(uuid.uuid4()),
            "score": 0
    }

    game_data["players"][player_name] = player_data
    client.set(f"game:{game_code}", json.dumps(game_data))

    return {"message": "Joined game", "game_code": game_code, "player_name": player_name}

@app.websocket("/ws/game/{game_code}/{player_name}")
async def game_websocket(websocket: WebSocket, game_code: str, player_name: str):
    await websocket.accept()
    game_data_bytes = client.get(f"game:{game_code}")
    if game_data_bytes is None:
        await websocket.send_text("Game not found")
        websocket.close()
    
    game_data = json.loads(game_data_bytes)
    # Check if the player is in the game
    logging.info("PLAYERS:", game_data["players"])
    if player_name not in game_data["players"]:
        await websocket.send_text("You are not a part of this game")
        websocket.close()

    id_to_websocket[game_data["players"][player_name]["id"]] = websocket
    client.set(f"game:{game_code}", json.dumps(game_data))

    await websocket.send_text("Waiting for game to start")

    while game_data["status"] == "waiting":
        await asyncio.sleep(0.5)

    try:
        while True:
            question = await get_random_question(game_code)
            await websocket.send_text(question)

            answer = await websocket.receive_text()
            is_correct = check_answer(question, answer)

            if is_correct:
                # Points will probably be determined by time since that person received the question
                # Points will also be divided by 2 if they got it on the second try with AI help
                points = 100
                await update_score(game_code, player_name, points=points)
                await websocket.send_text(f"Correct! +{points} points")
            else:
                await websocket.send_text("Incorrect! Here's some help")
                hint = get_hint(question)
                await websocket.send_text(hint)

                second_attempt = await websocket.receive_text()
                if check_answer(question, second_attempt):
                    await update_score(game_code, player_name, points=points/2)
                    await websocket.send_text(f"Correct! +{points/2} points")
                else:
                    await websocket.send_text("Incorrect! Better luck next time")
    except WebSocketDisconnect:
        await handle_disconnect(game_code, player_name)


@app.websocket("/ws/host/{game_code}")
async def host_websocket(websocket: WebSocket, game_code: str):
    await websocket.accept()
    logging.info("Host joined")
    game_data_bytes = client.get(f"game:{game_code}")
    if game_data_bytes is None:
        await websocket.send_text("Game not found")
        return

    # wait until start is received from the host in the socket
    await websocket.send_text("Type 'start' to start the game")

    while True:
        start_command = await websocket.receive_text()
        if start_command.lower() == "start":
            logging.info("Start received, starting game")
            break
        else:
            logging.info(f"Received invalid command from host: {start_command}")
            await websocket.send_text("Invalid command. Type 'start' to start the game")

    game_data = json.loads(game_data_bytes)
    game_data["start_time"] = time.time()
    client.set(f"game:{game_code}", json.dumps(game_data))
    await broadcast(id_to_websocket, client, game_data["code"], "Starting game")

    logging.info("Broadcast successful")

    try:
        while True:
            pass
    except WebSocketDisconnect:
        pass

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
