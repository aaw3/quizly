from typing import Dict
from fastapi import WebSocket, WebSocketDisconnect
from redis import Redis
import json
import random
import uuid
import logging
import yaml
from yaml import safe_load
import os
import asyncio
import time

# Constants for game status
STATUS_WAITING = "waiting"
STATUS_STARTED = "started"
STATUS_PAUSED = "paused"
STATUS_ENDED = "ended"


# Helper functions for Redis data retrieval
def get_game_data(client: Redis, game_code: str):
    game_data_bytes = client.get(f"game:{game_code}")
    return json.loads(game_data_bytes) if game_data_bytes else None


def set_game_status(client: Redis, game_code: str, status: str):
    game_data = get_game_data(client, game_code)
    if game_data:
        game_data["status"] = status
        client.set(f"game:{game_code}", json.dumps(game_data))


# Player registration and validation
def register_player(game_data: dict, player_name: str):
    player_data = {
        "id": str(uuid.uuid4()),
        "score": 0,
        "questions_answered": []
    }
    game_data["players"][player_name] = player_data
    return player_data


async def validate_player(game_data: dict, player_name: str, websocket: WebSocket):
    if not game_data or player_name not in game_data["players"]:
        await websocket.send_text("You are not part of this game")
        await websocket.close()
        logging.info(f"WebSocket closed for '{player_name}': not part of game")
        return False
    return True


# Load and initialize questions
def load_questions():
    try:
        quiz_source = random.choice(os.listdir("quizzes"))
        with open(f"quizzes/{quiz_source}", "r") as file:
            quiz_yml = safe_load(file)
        return quiz_yml.get("questions", [])
    except (yaml.YAMLError, FileNotFoundError):
        logging.error("Unable to load quiz file")
        return None


def init_game_data(game_code: str, questions: list):
    return {
        "code": game_code,
        "players": {},
        "status": STATUS_WAITING,
        "questions": questions,
        "start_time": None
    }


async def manage_game_session(websocket: WebSocket, client: Redis, game_code: str, player_name: str):
    """Manages the game session for a player by running question handling and interrupt monitoring concurrently."""
    
    async def handle_interrupts():
        """Monitors game status and handles pauses or game end."""
        try:
            while True:
                game_data = get_game_data(client, game_code)
                if game_data["status"] == "paused":
                    await websocket.send_text("[PAUSE]")
                    logging.info(f"Game paused for player '{player_name}'.")
                    await wait_for_resume(game_data, game_code, websocket, client)
                elif game_data["status"] == "ended":
                    await websocket.send_text("[END]")
                    logging.info(f"Game ended for player '{player_name}'.")
                    break
                await asyncio.sleep(0.5)
        except WebSocketDisconnect:
            logging.info(f"Player '{player_name}' disconnected during interrupts.")

    async def handle_questions():
        """Handles question-answer flow for the player."""
        try:
            while True:
                game_data = get_game_data(client, game_code)
                if not game_data: 
                    await websocket.send_text("Error: Game not found.")
                elif player_name not in game_data["players"]:
                    # Retry
                    game_data = get_game_data(client, game_code)
                    logging.error("Game Data State: " + str(game_data))
                    if player_name not in game_data["players"]:
                        await websocket.send_text("Error: You are not part of this game or your session has expired.")
                        logging.error(f"Player '{player_name}' missing from game data in game '{game_code}'.")
                        break
                
                questions_answered = game_data["players"][player_name]["questions_answered"]

                question = await get_random_question(game_data, questions_answered)
                if not question:
                    await websocket.send_text("You've answered all the questions!")
                    break

                await websocket.send_text(json.dumps(question))
                logging.info(f"Sent question to player '{player_name}': {question}")

                try:
                    # Create loop waiting for input, in paused state nothing happens
                    # If user sends an input after pause ends, we grab game_data so it can be processed on resume
                    while True:
                        answer = await websocket.receive_text()
                        game_data = get_game_data(client, game_code)
                        if game_data["status"] != STATUS_STARTED:
                            continue
                        else:
                            break
                    if check_answer(question, answer):
                        await websocket.send_text("Correct!")
                    else:
                        await websocket.send_text("Incorrect!")
                except WebSocketDisconnect:
                    logging.info(f"Player '{player_name}' disconnected while answering questions.")
                    break
        except WebSocketDisconnect:
            logging.info(f"Player '{player_name}' disconnected.")

    # Create tasks for interrupts and questions
    interrupt_task = asyncio.create_task(handle_interrupts())
    question_task = asyncio.create_task(handle_questions())

    try:
        # Wait for the first task to complete (e.g., game ends, player disconnects)
        done, pending = await asyncio.wait(
            [interrupt_task, question_task],
            return_when=asyncio.FIRST_COMPLETED
        )
    finally:
        # Cancel any pending tasks
        for task in pending:
            task.cancel()

        # Cleanup WebSocket and Redis mappings
        game_data = get_game_data(client, game_code)
        if player_name in game_data["players"]:
            del id_to_websocket[game_data["players"][player_name]["id"]]
        await websocket.close()
        logging.info(f"WebSocket connection closed for player '{player_name}' in game '{game_code}'")



# Utility Functions
async def get_random_question(game_data, questions_answered):
    questions = game_data["questions"]
    available_questions = [q for q in questions if q["question"] not in questions_answered]
    if available_questions:
        question = random.choice(available_questions)
        question.pop("correct", None)
        return question
    return None


def check_answer(question, answer):
    return question.get("correct", "").lower() == answer.lower()


async def wait_for_resume(game_data, game_code, websocket, client):
    while game_data["status"] == STATUS_PAUSED:
        await asyncio.sleep(0.5)
        game_data = get_game_data(client, game_code)
    await websocket.send_text("[RESUME]")


def generate_game_code():
    return str(uuid.uuid4())[:5].upper()


# Broadcast message to all players
async def broadcast(id_to_websocket: dict, client: Redis, game_code: str, message: str):
    game_data = get_game_data(client, game_code)
    for player_id, websocket in id_to_websocket.items():
        await websocket.send_text(message)

async def handle_host_commands(websocket: WebSocket, client: Redis, game_data: dict):
    game_code = game_data["code"]

    if game_data["status"] == STATUS_WAITING:
        await websocket.send_text("Type 'start' to begin the game")

    try:
        while True:
            command = (await websocket.receive_text()).lower()

            if command == "start" and game_data["status"] == "waiting":
                # Essential: Must get the gate state before trying to change game values, as it will update current game data with outdated data
                game_data = get_game_data(client, game_code)
                game_data["status"] = "started"
                game_data["start_time"] = time.time()
                await update_game_data(game_code, game_data, websocket, "[START]")

            elif command == "pause" and game_data["status"] == "started":
                game_data = get_game_data(client, game_code)
                game_data["status"] = "paused"
                logging.error("GAME INFO:", str(game_data))
                await update_game_data(game_code, game_data, websocket, "[PAUSE]")

            elif command == "resume" and game_data["status"] == "paused":
                game_data = get_game_data(client, game_code)
                game_data["status"] = "started"
                await update_game_data(game_code, game_data, websocket, "[RESUME]")

            elif command == "end":
                game_data = get_game_data(client, game_code)
                game_data["status"] = "ended"
                await update_game_data(game_code, game_data, websocket, "[END]")
                break

            else:
                await websocket.send_text("Invalid command or inappropriate command for the current game state.")

    except WebSocketDisconnect:
        logging.info("Host disconnected")

    await websocket.close()
    logging.info("Host WebSocket connection closed.")


async def update_game_data(game_code: str, game_data: dict, websocket: WebSocket, message: str):
    """Utility function to update game data in Redis and send a message to the host."""
    client = Redis("redis", port=6379, db=0)
    client.set(f"game:{game_code}", json.dumps(game_data))
    await websocket.send_text(message)
    logging.info(message)

async def wait_for_game_start(websocket: WebSocket, game_code: str):
    """Continuously checks if the game status is 'started' and notifies the player."""
    client = Redis("redis", port=6379, db=0)

    # Send initial message
    await websocket.send_text("Waiting for game to start")

    while True:
        game_data_bytes = client.get(f"game:{game_code}")
        if game_data_bytes:
            game_data = json.loads(game_data_bytes)
            if game_data["status"] == "started":
                await websocket.send_text("[START]")
                logging.info(f"Player notified of game start for game '{game_code}'")
                break
        await asyncio.sleep(0.5)