from dotenv import load_dotenv
from groq import Groq
import os
import uuid


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
                "content": f"Provide hints and help the user understand. Do not give the answer. Be brief. Don't give affirmations. Question: {question}\nCorrect Answer: {answerCorrect}\nUser's Answer: {answerIncorrect}"
            }
        ],
        model="llama3-8b-8192",
        max_tokens=100,
        stream=False
    )



    return chat_completion.choices[0].message.content

def generate_questions(prompt: str) -> str:
    """
    Generate a new set of questions based on a prompt and save to a YAML file.

    Args:
        prompt (str): The input prompt for the AI to generate questions.

    Returns:
        str: A filepath (quizes/questions_uuid()) for the new set of questions.
    """
    try:
        chat_completion = client.chat.completions.create(
            messages=[
                {
                    "role": "user",
                    "content": (
                        "Generate a set of multiple-choice questions based on the following prompt. "
                        "The number of questions should be specified if not default to 10"
                        "Provide each question with options A, B, C, D, and the correct answer. "
                        "Respond with the YAML output and nothing else. "
                        "Output should be in YAML format:\n\n"
                        "questions:\n"
                        "  - question: \"Your question here\"\n"
                        "    options:\n"
                        "      A: \"Option A\"\n"
                        "      B: \"Option B\"\n"
                        "      C: \"Option C\"\n"
                        "      D: \"Option D\"\n"
                        "    answer: \"A\"\n\n"
                        f"Prompt: {prompt}"
                    )
                }
            ],
            model="llama3-8b-8192",
            max_tokens=1000,
            stream=False
        )


        questions_yaml = chat_completion.choices[0].message.content
        output_file = os.path.join("quizzes", f"questions_{uuid.uuid4()}.yaml")

        with open(output_file, "w") as file:
            file.write(questions_yaml)

        return output_file

    except Exception as e:
        print(f"Error: {e}")