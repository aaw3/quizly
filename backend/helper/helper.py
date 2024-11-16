from typing import Dict
from fastapi import WebSocket
from redis import Redis
import json

async def get_random_question(game_code: str):
    # Fetch or generate a random question for the game
    return "Sample question?"

def check_answer(question: str, answer: str) -> bool:
    # Logic to check if the answer is correct
    return True  # Placeholder

async def update_score(game_code: str, player_name: str, points: int):
    # Update player's score in Redis
    pass

def get_hint(question: str) -> str:
    # AI-based hint generation
    return "Think about the key concept here."

async def get_game_metrics(game_code: str) -> Dict:
    # Gather real-time metrics from Redis
    return {"players": 5, "correct_answers": 3}  # Placeholder

async def handle_disconnect(game_code: str, player_name: str):
    # Handle player disconnect
    pass

async def broadcast(id_to_websocket: dict[str, WebSocket], client: Redis, game_code: str, message: str):
    game_data = client.get(f"game:{game_code}")
    if game_data is None:
        return False

    game_data = json.loads(game_data)
    for player in game_data["players"]:
        print(player)
        if player["id"] in id_to_websocket:
            await id_to_websocket[player["id"]].send_text(message)