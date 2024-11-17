import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom"; // For navigation
import Header from "../components/Header";
import { useGameContext } from "../components/GameContext"; // Import GameContext

const JoinGame = () => {
  const [localGameCode, setLocalGameCode] = useState(""); // Input for game code
  const [localPlayerName, setLocalPlayerName] = useState(""); // Input for player name
  const [error, setError] = useState<string | null>(null);
  const { setGameCode, setPlayerName, setIsGameActive } = useGameContext(); // Access context setters
  const navigate = useNavigate();

  // Join Game
  const joinGame = async () => {
    setError(null);
    try {
      // API Call to join game
      const response = await axios.post(
        `http://localhost:8000/joingame/${localGameCode}?player_name=${localPlayerName}`
      );

      // Update context with game data
      setGameCode(localGameCode);
      setPlayerName(localPlayerName);

      // Establish WebSocket connection
      const socket = new WebSocket(
        `ws://localhost:8000/ws/game/${localGameCode}/${localPlayerName}`
      );

      socket.onopen = () => {
        console.log("WebSocket connection established for player:", localPlayerName);
      };

      socket.onmessage = (event) => {
        console.log("WebSocket message received:", event.data);

        try {
          
          const data = event.data;

          if (data === "[START]") {
            console.log("Game has started for player, navigating to GamePlay...");
            setIsGameActive(true); // Update game context to active
            navigate("/gameplay", { replace: true }); // Navigate to GamePlay page
          } else if (data.question) {
            console.log("Received question data:", data.question);
          } else {
            console.log("Unhandled WebSocket message:", data);
          }
        } catch (err) {
          console.warn("Non-JSON WebSocket message or error:", event.data);
        }
      };

      socket.onclose = () => {
        console.log("WebSocket connection closed for player:", localPlayerName);
      };
    } catch (err: any) {
      setError(err.response?.data?.message || "Error joining game. Check your game code.");
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <section className="relative bg-gradient-to-b from-blue-50 to-gray-50 min-h-screen pb-96">
      <Header />
      <div className="container mx-auto flex flex-col items-center px-4 text-center py-20 md:px-10 lg:px-32 xl:max-w-4xl">
        <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl lg:text-6xl text-gray-800">
          Join a <span className="text-violet-600">Game</span>
        </h1>
        <p className="px-6 mt-6 mb-12 text-lg text-gray-700 sm:px-12 lg:px-20">
          Enter a game code to join your friends and compete in fun, interactive quizzes powered by AI.
        </p>

        <div className="w-full max-w-md space-y-4">
          <input
            type="text"
            placeholder="Enter Game Code"
            value={localGameCode}
            onChange={(e) => setLocalGameCode(e.target.value)}
            className="w-full px-6 py-4 text-lg rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200"
          />
          <input
            type="text"
            placeholder="Enter Your Name"
            value={localPlayerName}
            onChange={(e) => setLocalPlayerName(e.target.value)}
            className="w-full px-6 py-4 text-lg rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200"
          />
          <button
            onClick={joinGame}
            disabled={!localGameCode || !localPlayerName} // Disable button if inputs are empty
            className="w-full px-6 py-3 text-lg font-medium rounded-lg bg-violet-600 text-white shadow-lg hover:bg-violet-700 transition duration-200"
          >
            Join Game
          </button>
        </div>

        {error && <p className="text-red-500 mt-4">{error}</p>}
      </div>
    </section>
  );
};

export default JoinGame;
