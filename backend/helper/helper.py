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
from ai import *
from github import *
import math

# Constants for game status
STATUS_WAITING = "WAITING"
STATUS_STARTED = "STARTED"
STATUS_PAUSED = "PAUSED"
STATUS_ENDED = "ENDED"

NUM_ATTEMPTS = 2


# Helper functions for Redis data retrieval
def get_game_data(client: Redis, game_code: str):
    game_data_bytes = client.get(f"game:{game_code}")
    return json.loads(game_data_bytes) if game_data_bytes else {}

def get_players_data(client: Redis, game_code: str):
    player_data_bytes = client.get(f"game:{game_code}:players")
    return json.loads(player_data_bytes) if player_data_bytes else {}

def save_game_data(client: Redis, game_code: str, game_data: dict):
    client.set(f"game:{game_code}", json.dumps(game_data))

def save_players_data(client: Redis, game_code: str, players_data: dict):
    client.set(f"game:{game_code}:players", json.dumps(players_data))

# DEPRICATED
#def set_game_status(client: Redis, game_code: str, status: str):
#    game_data = get_game_data(client, game_code)
#    if game_data:
#        game_data["status"] = status
#        client.set(f"game:{game_code}", json.dumps(game_data))

def get_game_state(client: Redis, game_code: str):
    state_data = client.get(f"game:{game_code}:state")
    # Have to decode as utf-8 string as it is stored as bytes stirng type in redis
    # Also need to remove the '"' as it comes encoded
    return state_data.decode('utf-8').strip('"') if state_data else None

def save_game_state(client: Redis, game_code: str, state_data: str):
    client.set(f"game:{game_code}:state", json.dumps(state_data))

def get_ai_response_cache(client: Redis, game_code: str):
    question_cache = client.get(f"game:{game_code}:question_responses")
    return json.loads(question_cache) if question_cache else {}

def save_ai_response_cache(client: Redis, game_code: str, user_answer: str, question_id: int, response: str):
    question_cache = get_ai_response_cache(client, game_code)
    question_id = str(question_id)
    if question_id not in question_cache:
        question_cache[question_id] = {}

    if user_answer not in question_cache[question_id]:
        question_cache[question_id][user_answer] = response
    client.set(f"game:{game_code}:question_responses", json.dumps(question_cache))



# Player registration and validation
def register_player(client: Redis, game_code: str, player_name: str, questions: list):
    player_data = {
        "id": str(uuid.uuid4()),
        "score": 0,
        "remaining_questions": random.sample(range(len(questions)), len(questions)),
        "correct_questions": [],
        "incorrect_questions": [],
        "current_question_index": -1,
        "websocket_id": None,
        "question_start_time": None,
        "question_attempt": 0,
        "github_avatar": get_github_avatar(player_name),
    }
    players_data = get_players_data(client, game_code)
    players_data[player_name] = player_data
    save_players_data(client, game_code, players_data)


async def validate_player(players_data: dict, player_name: str, websocket: WebSocket):
    if not players_data or player_name not in players_data:
        await websocket.send_text("[USER_NOT_IN_GAME]")
        await websocket.close()
        logging.info(f"WebSocket closed for '{player_name}': not part of game")
        return False
    return True


# Load and initialize questions
def load_questions(user_prompt: str):
    try:
        quiz_source = generate_questions(user_prompt)
        with open(f"{quiz_source}", "r") as file:
            quiz_yml = safe_load(file)
        return quiz_yml.get("questions", [])
    except (yaml.YAMLError):
        logging.error("yaml")
        return None
    except (FileNotFoundError):
        logging.error("File not found")
        return None


def init_game_data(game_code: str, questions: list):
    return {
        "code": game_code,
        "questions": questions,
        "start_time": None,
    }


async def manage_game_session(websocket: WebSocket, client: Redis, game_code: str, player_name: str):
    """Manages the game session for a player by running question handling and interrupt monitoring concurrently."""
    
    async def handle_interrupts():
        """Monitors game status and handles pauses or game end."""
        try:
            while True:
                game_state = get_game_state(client, game_code)
                if game_state == STATUS_PAUSED:
                    await websocket.send_text("[PAUSE]")
                    logging.info(f"Game paused for player '{player_name}'.")
                    await wait_for_resume(game_code, websocket, client)
                elif game_state == STATUS_ENDED:
                    await websocket.send_text("[END]")
                    logging.info(f"Game ended for player '{player_name}'.")
                    break
                await asyncio.sleep(0.5)
        except WebSocketDisconnect:
            logging.info(f"Player '{player_name}' disconnected during interrupts.")

    async def handle_questions():
        """Handles question-answer flow for the player."""
        #handled_starting_condition = False

        # Must be global
        ranOutOfTime = False
        waitingAfterQuestion = False
        try:
            while True:
                game_data = get_game_data(client, game_code)
                players_data = get_players_data(client, game_code)
                if not game_data: 
                    await websocket.send_text("[GAME_NOT_FOUND]")
                elif player_name not in players_data:
                    # Retry
                    if player_name not in players_data:
                        await websocket.send_text("[USER_NOT_IN_GAME]")
                        logging.error(f"Player '{player_name}' missing from game data in game '{game_code}'.")
                        break

                # Try to clear any incoming input before the game starts
                try:
                    while True: #and not handled_starting_condition:
                         await asyncio.wait_for(websocket.receive_text(), timeout=0.1)

                # Ran out of input (ideal)
                except asyncio.TimeoutError:
                    #handled_starting_condition = True
                    pass 

                # Loop through until receives any input to pause functionality
                if ranOutOfTime:
                    response = {"out_of_time": {"answer": f"{correctAnswer}. {question["options"][correctAnswer]}"}}
                    await websocket.send_text(json.dumps(response))
                    await websocket.receive_text()
                    waitingAfterQuestion = False
                    ranOutOfTime = False
                elif waitingAfterQuestion:
                    # Wait for user for next question
                    await websocket.receive_text()

                    
                
                questions_remaining = players_data[player_name]["remaining_questions"]
                if len(questions_remaining) == 0 and players_data[player_name]["current_question_index"] == -1:
                    await websocket.send_text("[ALL_QUESTIONS_ANSWERED]")
                    break


                if (players_data[player_name]["question_start_time"] is not None and players_data[player_name]["question_start_time"] + 30 - time.time() <= 0):
                    players_data[player_name]["incorrect_questions"].append(players_data[player_name]["current_question_index"])
                    players_data[player_name]["current_question_index"] = -1
                    players_data[player_name]["question_attempt"] = 0
                    players_data[player_name]["question_start_time"] = None
                    save_players_data(client, game_code, players_data)

                if players_data[player_name]["current_question_index"] == -1:
                    question_index = questions_remaining.pop()
                    question = await get_random_question(game_data, question_index)
                    players_data[player_name]["remaining_questions"] = questions_remaining
                    players_data[player_name]["question_start_time"] = time.time()
                    players_data[player_name]["current_question_index"] = question_index
                    save_players_data(client, game_code, players_data)
                
                else:
                    question_index = players_data[player_name]["current_question_index"]
                    question = game_data["questions"][question_index]

                correctAnswer = question.get("answer", "")
                # Don't send correct answer to player
                del question["answer"]

                question['start_time'] = players_data[player_name]["question_start_time"]
                question['questions_remaining'] = len(players_data[player_name]["remaining_questions"])
                question['total_questions'] = len(game_data["questions"])
                response = {"question": question}
                await websocket.send_text(json.dumps(response))
                logging.info(f"Sent question to player '{player_name}': {question}")

                try:
                    points = 1000
                    wrong_multiplier = 0.65
                    time_multiplier = 0.75
                    saved_attempts = players_data[player_name]["question_attempt"]

                    for attempt in range(saved_attempts, NUM_ATTEMPTS):
                        # Create loop waiting for input, in paused state nothing happens
                        # If user sends an input after pause ends, we grab game_data so it can be processed on resume
                        while True:
                            user_answer = ""
                            try:
                                user_answer = await asyncio.wait_for(websocket.receive_text(), timeout=players_data[player_name]["question_start_time"] + 30 - time.time())
                            except asyncio.TimeoutError:
                                if players_data[player_name]["question_start_time"] + 30 - time.time() <= 0:
                                    players_data[player_name]["incorrect_questions"].append(question_index)
                                    players_data[player_name]["current_question_index"] = -1
                                    players_data[player_name]["question_attempt"] = 0
                                    players_data[player_name]["question_start_time"] = None
                                    save_players_data(client, game_code, players_data)
                                    ranOutOfTime = True
                                    break

                            # Check if answer is valid
                            user_answer = validate_answer(user_answer, question["options"])
                            if user_answer is None:
                                response = {"attempt": {"valid": False, "final": False, "correct": False, "points": 0}}
                                await websocket.send_text(json.dumps(response))
                                continue
                            game_state = get_game_state(client, game_code)
                            if game_state != STATUS_STARTED:
                                continue
                            else:
                                break

                        if ranOutOfTime:
                            points = 0
                            break
                        # First answer
                        if check_answer(correctAnswer, user_answer):
                            points = get_score(points, attempt, wrong_multiplier, time_multiplier, players_data[player_name]["question_start_time"])
                            response = {"attempt": {"valid": True, "final": True, "correct": True, "points": points}}
                            await websocket.send_text(json.dumps(response))
                            players_data = get_players_data(client, game_code)
                            players_data[player_name]["correct_questions"].append(question_index)
                            save_players_data(client, game_code, players_data)
                            waitingAfterQuestion = True
                            break
                        else:
                            if attempt == 0:
                                response = {"attempt": {"valid": True, "final": False, "correct": False}}
                                await websocket.send_text(json.dumps(response))
                                players_data = get_players_data(client, game_code)
                                players_data[player_name]["question_attempt"] += 1
                            elif attempt == 1:
                                points = 0
                                response = {"attempt": {"final": True, "correct": False, "points": points, "answer": correctAnswer}}
                                await websocket.send_text(json.dumps(response))
                                players_data[player_name]["incorrect_questions"].append(question_index)
                                save_players_data(client, game_code, players_data)
                                waitingAfterQuestion = True
                                break

                        # Get help from AI:
                        cached_help = get_ai_response_cache(client, game_code)
                        if str(question_index) in cached_help and user_answer in cached_help[str(question_index)]:
                            ai_response = cached_help[str(question_index)][user_answer]
                        else:
                            ai_response = get_ai_help(question["options"][correctAnswer], question["options"][user_answer], question["question"])
                            save_ai_response_cache(client, game_code, user_answer, question_index, ai_response)
                        response = {"help": ai_response}
                        await websocket.send_text(json.dumps(response))

                    players_data = get_players_data(client, game_code)
                    players_data[player_name]["score"] += points
                    players_data[player_name]["current_question_index"] = -1
                    players_data[player_name]["question_attempt"] = 0
                    players_data[player_name]["question_start_time"] = None
                    save_players_data(client, game_code, players_data)
                    waitingAfterQuestion = True

                    # Send score metrics to player
                    relative_leaderboard = get_relative_leaderboard(players_data, player_name)
                    response = {"leaderboard": relative_leaderboard}
                    await websocket.send_text(json.dumps(response))

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
        #players_data = get_players_data(client, game_code)
        #if player_name in players_data:
        #    del id_to_websocket[players_data[player_name]["id"]]
        await websocket.close()
        logging.info(f"WebSocket connection closed for player '{player_name}' in game '{game_code}'")



# Utility Functions
def get_score(max_points, attempts, wrong_multiplier, time_multiplier, question_start_time, time_limit=30, scaling_factor=.025):
    # Calculate score based on time taken to answer
    time_taken = time.time() - question_start_time
    time_taken = min(time_taken, time_limit)

    time_coef = time_multiplier + (1-time_multiplier) * ((math.log(1+scaling_factor*(time_limit-time_taken))/math.log(1+scaling_factor*time_limit)))
    wrong_coef = wrong_multiplier ** attempts

    score = max_points * max(wrong_coef * time_coef, 0)

    return int(round(score))
    
    

def get_player_avg_score(players_data: dict, player_name: str):
    player_score = players_data[player_name]["score"]
    question_total = len(players_data[player_name]["correct_questions"]) + len(players_data[player_name]["incorrect_questions"])
    if question_total == 0:
        return 0
    player_avg_score = player_score / (len(players_data[player_name]["correct_questions"]) + len(players_data[player_name]["incorrect_questions"]))
    return player_avg_score

def get_relative_leaderboard(players_data: dict, player_name: str):
    # Get most closely ahead of player and behind of player based on their score average
    player_score = players_data[player_name]["score"]
    player_avg_score = get_player_avg_score(players_data, player_name)
    relative_leaderboard = {
        "ahead": None,
        "behind": None,
        "place": 0,
        "score": player_score,
        "avg_score": player_avg_score,
    }

    # Iterate over other players to find the closest ahead and behind
    for other_player, other_data in players_data.items():
        if other_player != player_name:
            other_player_avg_score = get_player_avg_score(players_data, other_player)
            # Check for the player ahead
            if other_player_avg_score > player_avg_score:
                if (
                    relative_leaderboard["ahead"] is None or
                    other_player_avg_score < relative_leaderboard["ahead"]["avg_score"]
                ):
                    relative_leaderboard["ahead"] = {
                        "player_name": other_player,
                        "avg_score": other_player_avg_score,
                        "github_avatar": other_data.get("github_avatar"),
                    }
            # Check for the player behind
            elif other_player_avg_score < player_avg_score:
                if (
                    relative_leaderboard["behind"] is None or
                    other_player_avg_score > relative_leaderboard["behind"]["avg_score"]
                ):
                    relative_leaderboard["behind"] = {
                        "player_name": other_player,
                        "avg_score": other_player_avg_score,
                        "github_avatar": other_data.get("github_avatar"),
                    }
    
    # Calculate player's place in the leaderboard
    relative_leaderboard["place"] = (
        len([p for p in players_data if get_player_avg_score(players_data, p) > player_avg_score]) + 1
    )
    
    return relative_leaderboard

def get_players_metrics(players_data: dict):
    # Return the scores, correct, incorrect, and score of each player
    player_metrics = {}
    for name, data in players_data.items():
        player_metrics[name] = {
            "score": int(round(data["score"])),
            "avg_score": int(round(get_player_avg_score(players_data, name))),
            "correct_questions": data["correct_questions"],
            "incorrect_questions": data["incorrect_questions"],
            "remaining_questions": data["remaining_questions"],
            "github_avatar": data["github_avatar"],
        }
    return player_metrics


def validate_answer(answer, question_options):
    if answer is None or answer == '' or answer.isspace():
        return None
    # Get the casing of the answer:
    keys = question_options.keys()
    if len(keys) == 0:
        return None
    upperCase = list(keys)[0].isupper()
    if answer.lower() in [k.lower() for k in question_options.keys()]:
        return answer.upper() if upperCase else answer.lower()

async def get_random_question(game_data, question_index):
    return game_data["questions"][question_index]


def check_answer(answerCorrect, answerUser):
    return answerCorrect.lower() == answerUser.lower()


async def wait_for_resume(game_code, websocket, client):
    game_state = get_game_state(client, game_code)
    while game_state == STATUS_PAUSED:
        await asyncio.sleep(0.5)
        game_state = get_game_state(client, game_code)
    await websocket.send_text("[RESUME]")


def generate_game_code():
    return str(uuid.uuid4())[:5].upper()


# DEPRICATED
# Broadcast message to all players
#async def broadcast(id_to_websocket: dict, client: Redis, game_code: str, message: str):
#    game_data = get_game_data(client, game_code)
#    for player_id, websocket in id_to_websocket.items():
#        await websocket.send_text(message)

async def manage_host_session(websocket: WebSocket, client: Redis, game_code: str):
    async def handle_host_commands():
        game_state = get_game_state(client, game_code)

        #await websocket.send_text(str(game_state) + str(STATUS_WAITING))

        if game_state == STATUS_WAITING:
            await websocket.send_text("[WAITING]")

        try:
            while True:
                command = (await websocket.receive_text()).lower()
                game_state = get_game_state(client, game_code)

                #await websocket.send_text(str(game_state) + str(command))

                if command == "start" and game_state == STATUS_WAITING:
                    # Essential: Must get the gate state before trying to change game values, as it will update current game data with outdated data
                    game_state = STATUS_STARTED
                    game_data = get_game_data(client, game_code)
                    game_data["start_time"] = time.time()
                    save_game_data(client, game_code, game_data)
                    save_game_state(client, game_code, game_state)
                    await websocket.send_text("[START]")

                elif command == "pause" and game_state == STATUS_STARTED:
                    game_state = STATUS_PAUSED
                    save_game_state(client, game_code, game_state)
                    await websocket.send_text("[PAUSE]")

                elif command == "resume" and game_state == STATUS_PAUSED:
                    game_state = STATUS_STARTED
                    save_game_state(client, game_code, game_state)
                    await websocket.send_text("[RESUME]")

                elif command == "end":
                    game_state = STATUS_ENDED
                    save_game_state(client, game_code, game_state)
                    await websocket.send_text("[END]")
                    break

                else:
                    await websocket.send_text(["[INVALID_COMMAND]"])

        except WebSocketDisconnect:
            logging.info("Host disconnected")

        await websocket.close()
        logging.info("Host WebSocket connection closed.")

    async def retrieve_game_metrics():
        # Send metrics when host joins if they reconnect
        player_metrics = get_players_metrics(get_players_data(client, game_code))
        response = {"metrics": player_metrics}
        await websocket.send_text(json.dumps(response))

        try:
            num_players = len(get_players_data(client, game_code))
            while True:
                game_state = get_game_state(client, game_code)
                players_data = get_players_data(client, game_code)

                num_players_current = len(players_data)
                
                if game_state == STATUS_STARTED or num_players_current != num_players:
                    game_data = get_game_data(client, game_code)
                    # Remove questions from game data to avoid bloating the socket message
                    game_data.pop("questions", None)
                    players_data = get_players_data(client, game_code)
                    player_metrics = get_players_metrics(players_data)
                    game_metrics = {
                        "game_data": game_data,
                        "player_metrics": player_metrics,
                    }
                    response = {"metrics": game_metrics}
                    await websocket.send_text(json.dumps(response))

                # Update player count if it has changed
                if num_players_current != num_players:
                    num_players = num_players_current

                await asyncio.sleep(1)
        except WebSocketDisconnect:
            logging.info("Host disconnected")

    command_task = asyncio.create_task(handle_host_commands())
    metrics_task = asyncio.create_task(retrieve_game_metrics())



    try:
        # Wait for the first task to complete (e.g., game ends, player disconnects)
        done, pending = await asyncio.wait(
            [command_task, metrics_task],
            return_when=asyncio.FIRST_COMPLETED
        )
    finally:
        # Cancel any pending tasks
        for task in pending:
            task.cancel()

        await websocket.close()
        logging.info(f"WebSocket connection closed for player '{player_name}' in game '{game_code}'")



# DEPRICATED
#async def update_game_data(game_code: str, game_data: dict, websocket: WebSocket, message: str):
#    """Utility function to update game data in Redis and send a message to the host."""
#    client = Redis("redis", port=6379, db=0)
#    client.set(f"game:{game_code}", json.dumps(game_data))
#    await websocket.send_text(message)
#    logging.info(message)

async def wait_for_game_start(websocket: WebSocket, game_code: str):
    """Continuously checks if the game status is 'started' and notifies the player."""
    client = Redis("redis", port=6379, db=0)

    # Send initial message
    game_state = get_game_state(client, game_code)
    if game_state == STATUS_WAITING:
        await websocket.send_text("[WAITING]")

    while True:
        game_state = get_game_state(client, game_code)
        if game_state and game_state == STATUS_STARTED:
                await websocket.send_text("[START]")
                logging.info(f"Player notified of game start for game '{game_code}'")
                break
        await asyncio.sleep(0.5)