from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
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
active_hosts = {}


# Create Game
@app.post("/creategame")
async def create_game():
    game_code = generate_game_code()
    questions = load_questions()
    if not questions:
        return JSONResponse(content={"message": "Error loading quiz file"}, status_code=500)

    game_data = init_game_data(game_code, questions)
    client.set(f"game:{game_code}", json.dumps(game_data))
    return {"game_code": game_code, "message": "Game created successfully"}


# Join Game
@app.post("/joingame/{game_code}")
async def join_game(game_code: str, player_name: str):
    game_data = get_game_data(client, game_code)
    if not game_data:
        return JSONResponse(content={"message": "Game not found"}, status_code=404)
    # If player is actively in game
    if player_name in game_data["players"] and game_data["players"][player_name]["connected"]:
        return {"message": "Player name already exists in game"}

    # If player is in game but got disconnected
    if player_name in game_data["players"] and not game_data["players"][player_name]["connected"]:
        return {"message": "Player reconnected"}
    
    game_data = get_game_data(client, game_code)
    # If player is new to game    
    player_data = register_player(game_data, player_name, game_data["questions"])
    client.set(f"game:{game_code}", json.dumps(game_data))
    logging.info(f"Player '{player_name}' added to game '{game_code}'. Updated game data: {game_data}")
    logging.error("GAME INFO:", str(game_data))

    return {"message": "Joined game", "game_code": game_code, "player_name": player_name}


# WebSocket for Player
@app.websocket("/ws/game/{game_code}/{player_name}")
async def game_websocket(websocket: WebSocket, game_code: str, player_name: str):
    await websocket.accept()
    try:
        logging.info(f"WebSocket connection established for player '{player_name}' in game '{game_code}'")

        game_data = get_game_data(client, game_code)
        if (not await validate_player(game_data, player_name, websocket)
            or not game_data
            or game_data["players"][player_name]["websocket_id"] is not None):
            return

        # Mutex for player connection
        websocket_id = str(uuid.uuid4())
        game_data["players"][player_name]["websocket_id"] = websocket_id

        id_to_websocket[game_data["players"][player_name]["id"]] = websocket
        game_data["players"][player_name]["connected"] = True
        client.set(f"game:{game_code}", json.dumps(game_data))

        # Handle game start and question/answer flow
        await wait_for_game_start(websocket, game_code)
        await manage_game_session(websocket, client, game_code, player_name)
    except WebSocketDisconnect:
        logging.info(f"Player '{player_name}' disconnected")
    except Exception as e:
        logging.error(f"Error in Player '{player_name}' websocket: {e}")
    finally:
        game_data = get_game_data(client, game_code)
        # Only set player as disconnected if they match the mutex
        if game_data and game_data["players"][player_name]["websocket_id"] == websocket_id:
            game_data["players"][player_name]["websocket_id"] = None
            client.set(f"game:{game_code}", json.dumps(game_data))
            logging.info(f"Player '{player_name}' disconnected in game '{game_code}'")


# WebSocket for Host
@app.websocket("/ws/host/{game_code}")
async def host_websocket(websocket: WebSocket, game_code: str):
    await websocket.accept()

    # Get this logic working when come back. Basically uses uuid as a mutex
    websocket_id = str(uuid.uuid4())

    try:
        logging.info("Host joined")

        game_data = get_game_data(client, game_code)
        if not game_data:
            await websocket.send_text("Game not found")
            await websocket.close()
            return

        if game_code in active_hosts:
            await websocket.send_text("Host already connected")
            await websocket.close()
            return

        active_hosts[game_code] = websocket_id

        await handle_host_commands(websocket, client, game_data)
    except WebSocketDisconnect:
        logging.info("Host disconnected")
    except Exception as e:
        logging.error(f"Error in host websocket: {e}")
    finally:
        if game_code in active_hosts and active_hosts[game_code] == websocket_id:
            del active_hosts[game_code]
            logging.info("Host cleaned up")
        


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


