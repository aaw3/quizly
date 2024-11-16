import requests

def get_github_avatar(username: str) -> str:
    response = requests.get(f"https://api.github.com/users/{username}")
    if "avatar_url" not in response.json():
        return None
    return response.json()["avatar_url"]