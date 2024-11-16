from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import redis
import uuid
import asyncio
import logging
from helper import *
import json
import random
import os
from yaml import safe_load, YAMLError
import time

app = FastAPI()

origins = [
    "http://localhost",
    "http://localhost:5173" # This one is essential
]

app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

client = redis.Redis("redis", port=6379, db=0)
id_to_websocket = {}


# Create Game
@app.post("/creategame")
async def create_game():
    game_code = generate_game_code()
    questions = load_questions()
    if not questions:
        return {"message": "Error loading quiz file"}

    game_data = init_game_data(game_code, questions)
    client.set(f"game:{game_code}", json.dumps(game_data))
    return {"game_code": game_code, "message": "Game created successfully"}


# Join Game
@app.post("/joingame/{game_code}")
async def join_game(game_code: str, player_name: str):
    game_data = get_game_data(client, game_code)
    if not game_data:
        return {"message": "Game not found"}

    player_data = register_player(game_data, player_name)
    client.set(f"game:{game_code}", json.dumps(game_data))
    logging.info(f"Player '{player_name}' added to game '{game_code}'. Updated game data: {game_data}")
    logging.error("GAME INFO:", str(game_data))

    return {"message": "Joined game", "game_code": game_code, "player_name": player_name}


# WebSocket for Player
@app.websocket("/ws/game/{game_code}/{player_name}")
async def game_websocket(websocket: WebSocket, game_code: str, player_name: str):
    await websocket.accept()
    logging.info(f"WebSocket connection established for player '{player_name}' in game '{game_code}'")

    game_data = get_game_data(client, game_code)
    if not await validate_player(game_data, player_name, websocket):
        return

    id_to_websocket[game_data["players"][player_name]["id"]] = websocket
    client.set(f"game:{game_code}", json.dumps(game_data))

    # Handle game start and question/answer flow
    await wait_for_game_start(websocket, game_code)
    await manage_game_session(websocket, client, game_code, player_name)


# WebSocket for Host
@app.websocket("/ws/host/{game_code}")
async def host_websocket(websocket: WebSocket, game_code: str):
    await websocket.accept()
    logging.info("Host joined")

    game_data = get_game_data(client, game_code)
    if not game_data:
        await websocket.send_text("Game not found")
        await websocket.close()
        return

    await handle_host_commands(websocket, client, game_data)


# WebSocket for Metrics
@app.websocket("/ws/metrics/{game_code}")
async def metrics_websocket(websocket: WebSocket, game_code: str):
    await websocket.accept()
    try:
        while True:
            metrics = await get_game_metrics(game_code)
            await websocket.send_json(metrics)
            await asyncio.sleep(1)
    except WebSocketDisconnect:
        logging.info("Metrics WebSocket disconnected")


