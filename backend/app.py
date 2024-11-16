from fastapi import FastAPI, WebSocket
import redis
import uuid
import asyncio
from helper import get_random_question, check_answer, get_hint, update_score, handle_disconnect, get_game_metrics


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

redis = await redis

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    while True:
        data = await websocket.receive_text()
        await websocket.send_text(f"Message text was: {data}")


# Create a creategame endpoint
@app.post("/creategame")
async def create_game():
    game_code = str(uuid.uuid4())[:8]
    game_data = {
        "code": game_code,
        "players": [],
        "status": "waiting",
        "questions": [],
        "start_time": None
    }

    await redis.set(f"game:{game_code}", game_data)
    return {"game_code": game_code, "message": "Game created successfully"}

@app.post("/joingame/{game_code}")
async def join_game(game_code: str, player_name: str):
    game_data = await redis.get(f"game:{game_code}")
    if not game_data:
        return {"message": "Game not found"}

    player_data = {
        "name": player_name,
        "score": 0,
        "answered_correctly": False
    }

    game_data["players"].append(player_data)
    await redis.set(f"game:{game_code}", game_data)

    return {"message": "Joined game", "game_code": game_code, "player_name": player_name}

@app.websocket("/ws/game/{game_code}/{player_name}")
async def game_websocket(websocket: WebSocket, game_code: str, player_name: str):
    await websocket.accept()
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


@app.websocket("/ws/metrics/{game_code}")
async def metrics_websocket(websocket: WebSocket, game_code: str):
    await websocket.accept()
    try:
        while True:
            metrics = await get_game_metrics(game_code)
            await websocket.send_json(metrics)
            await asyncio.sleep(1)
    except WebSocketDisconnect:
        print("Game-starter disconnected from metrics")
