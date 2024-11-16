from groq import Groq
import os
from dotenv import load_dotenv
load_dotenv()

api_key = os.getenv("GROQ_API_KEY")
client = Groq(api_key=api_key)


def get_ai_help(answerCorrect: str, answerIncorrect: str, question: str) -> str:

    chat_completion = client.chat.completions.create(
        messages=[
            #{
            #    "role": "system",
            #    "content": "Provide hints and explanations without giving the answer. Be brief."
            #},
            {
                "role": "user",
                "content": f"Provide hints and help the user understand. Do not give the answer. Be brief. Question: {question}\nCorrect Answer: {answerCorrect}\nUser's Answer: {answerIncorrect}"
            }
        ],
        model="llama3-8b-8192",
        max_tokens=100,
        stream=False
    )



    return chat_completion.choices[0].message.content