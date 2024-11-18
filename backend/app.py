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
from dotenv import load_dotenv

app = FastAPI()

load_dotenv()
CORS_URL = os.getenv("CORS_URL")


origins = []

if CORS_URL:
    origins.append(CORS_URL)

app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

client = redis.Redis("redis", port=6379, db=0)
#id_to_websocket = {}
active_hosts = {}


# Create Game
@app.post("/api/creategame")
async def create_game(user_prompt: str):
    game_code = generate_game_code()
    questions = load_questions(user_prompt)
    if not questions:
        return JSONResponse(content={"message": "Error loading quiz file"}, status_code=500)

    game_data = init_game_data(game_code, questions)
    save_game_data(client, game_code, game_data)
    save_game_state(client, game_code, STATUS_WAITING)
    return {"game_code": game_code, "message": "Game created successfully"}


# Join Game
@app.post("/api/joingame/{game_code}")
async def join_game(game_code: str, player_name: str):
    game_data = get_game_data(client, game_code)
    if not game_data:
        return JSONResponse(content={"mesplayers_datasage": "Game not found"}, status_code=404)
    # If player is actively in game
    players_data = get_players_data(client, game_code)
    if players_data and player_name in players_data and players_data[player_name]["websocket_id"] is not None:
        return JSONResponse(content={"message": "Player already in game"}, status_code=400)

    # If player is in game but got disconnected
    if player_name in players_data and not players_data[player_name]["websocket_id"] is not None:
        return {"message": "Player reconnected"}
    
    #players_data = get_game_data(client, game_code)
    # If player is new to game
    register_player(client, game_code, player_name, game_data["questions"])
    #save_players_data(client, game_code, players_data)
    logging.info(f"Player '{player_name}' added to game '{game_code}'. Updated game data: {game_data}")

    return {"message": "Joined game", "game_code": game_code, "player_name": player_name}


# WebSocket for Player
@app.websocket("/ws/game/{game_code}/{player_name}")
async def game_websocket(websocket: WebSocket, game_code: str, player_name: str):
    await websocket.accept()
    try:
        logging.info(f"WebSocket connection established for player '{player_name}' in game '{game_code}'")

        players_data = get_players_data(client, game_code)
        if (not await validate_player(players_data, player_name, websocket)
            or not players_data
            or players_data[player_name]["websocket_id"] is not None):
            return

        # Mutex for player connection
        websocket_id = str(uuid.uuid4())
        players_data[player_name]["websocket_id"] = websocket_id

        #id_to_websocket[players_data[player_name]["id"]] = websocket
        
        save_players_data(client, game_code, players_data)

        # Handle game start and question/answer flow
        game_state = get_game_state(client, game_code)
        if game_state == STATUS_WAITING:
            await wait_for_game_start(websocket, game_code)
        elif game_state == STATUS_ENDED:
            await websocket.send_text("[END]")
            await websocket.close()
            return
        #elif game_state == STATUS_PAUSED:
        #    await websocket.send_text("[PAUSE]")
        elif game_state == STATUS_STARTED:
            await websocket.send_text("[START]")
        await manage_game_session(websocket, client, game_code, player_name)
    except WebSocketDisconnect:
        logging.info(f"Player '{player_name}' disconnected")
    except Exception as e:
        logging.error(f"Error in Player '{player_name}' websocket: {e}")
    finally:
        players_data = get_players_data(client, game_code)
        # Only set player as disconnected if they match the mutex
        if players_data and players_data[player_name]["websocket_id"] == websocket_id:
            players_data[player_name]["websocket_id"] = None
            save_players_data(client, game_code, players_data)
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
            await websocket.send_text("[GAME_NOT_FOUND]")
            await websocket.close()
            return

        if game_code in active_hosts:
            await websocket.send_text("[HOST_ALREADY_CONNECTED]")
            await websocket.close()
            return

        active_hosts[game_code] = websocket_id

        await manage_host_session(websocket, client, game_code)
    except WebSocketDisconnect:
        logging.info("Host disconnected")
    except Exception as e:
        logging.error(f"Error in host websocket: {e}")
    finally:
        if game_code in active_hosts and active_hosts[game_code] == websocket_id:
            del active_hosts[game_code]
            logging.info("Host cleaned up")
        


# Is being developed under host instead
# WebSocket for Metrics
#@app.websocket("/ws/metrics/{game_code}")
#async def metrics_websocket(websocket: WebSocket, game_code: str):
#    await websocket.accept()
#    try:
#        while True:
#            metrics = await get_game_metrics(game_code)
#            await websocket.send_json(metrics)
#            await asyncio.sleep(1)
#    except WebSocketDisconnect:
#        logging.info("Metrics WebSocket disconnected")


