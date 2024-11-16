from fastapi import FastAPI, WebSocket
import redis


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

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    while True:
        data = await websocket.receive_text()
        await websocket.send_text(f"Message text was: {data}")


# Create a creategame endpoint
@app.post("/creategame")
async def create_game():
    game_code = str(uuid.uuid4()[:8])
    game_data = {
        "code": game_code,
        "players": [],
        "status": "waiting",
        "questions": [],
        "start_time": None
    }

    await redis.