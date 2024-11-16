from typing import Dict
from fastapi import WebSocket
from redis import Redis
import json
import random

async def get_random_question(client: Redis, questions_already_answered: list, game_code: str):
    game_data = get_game_data(client, game_code)

    if game_data is None:
        return None

    questions = game_data["questions"]
    if len(questions_already_answered) == len(questions):
        return None

    # return and remove q['answer'] from each question
    question = random.choice([q for q in questions if q['question'] not in questions_already_answered])
    del question['correct']
    return question
    

def check_answer(client: Redis, question: str, answer: str, game_code: str) -> bool:
    game_data = get_game_data(client, game_code)

    if game_data is None:
        return False

    for q in game_data["questions"]:
        print("==Q IS==", q["question"], "==QUESTON IS==", question["question"])
        if q["question"] == question:
            for i in range(10):
                print("TRUE!!!")
            return q["correct"].lower() == answer.lower()
    
    return False
    

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
    # Ideally would deny user from connecting if already connected, but if their websocket drops, allow re-entry
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
    
    return True

def get_game_data(client: Redis, game_code: str):
    game_data = client.get(f"game:{game_code}")
    if game_data is None:
        return None
    
    return json.loads(game_data)