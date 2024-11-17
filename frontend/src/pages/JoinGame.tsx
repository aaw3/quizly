import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom"; // For navigation
import Header from "../components/Header";
import { useGameContext } from "../components/GameContext"; // Import GameContext

const JoinGame = () => {
  const [localGameCode, setLocalGameCode] = useState(""); // Input for game code
  const [localPlayerName, setLocalPlayerName] = useState(""); // Input for player name
  const [error, setError] = useState<string | null>(null);
  const [waiting, setWaiting] = useState(false); // Track waiting state
  const { setGameCode, setPlayerName, setIsGameActive } = useGameContext(); // Access context setters
  const navigate = useNavigate();

  // Join Game
  const joinGame = async () => {
    setError(null);
    try {
      // API Call to join game
      const response = await axios.post(
        `${import.meta.env.VITE_PROTOCOL}://${import.meta.env.VITE_HOST}:${import.meta.env.VITE_PORT}/api/joingame/${localGameCode}?player_name=${localPlayerName}`
      );

      // Update context with game data
      setGameCode(localGameCode);
      setPlayerName(localPlayerName);
      setWaiting(true); // Set waiting state to true

      // Establish WebSocket connection
      const socket = new WebSocket(
        `ws://${import.meta.env.VITE_HOST}:${import.meta.env.VITE_PORT}/ws/game/${localGameCode}/${localPlayerName}`
      );

      socket.onopen = () => {
        console.log(
          "WebSocket connection established for player:",
          localPlayerName
        );
      };

      socket.onmessage = (event) => {
        console.log("WebSocket message received:", event.data);

        try {
          const data = event.data;

          if (data === "[START]") {
            console.log(
              "Game has started for player, navigating to GamePlay..."
            );
            setIsGameActive(true); // Update game context to active
            socket.close();
            navigate("/gameplay", { replace: true }); // Navigate to GamePlay page
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
      setError(
        err.response?.data?.message ||
          "Error joining game. Check your game code."
      );
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <section className="relative bg-gradient-to-b from-violet-50 to-gray-50 min-h-screen pb-96">
      <Header />
      <div className="container mx-auto flex flex-col items-center px-4 text-center py-20 md:px-10 lg:px-32 xl:max-w-4xl">
        {!waiting ? (
          <>
            <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl lg:text-6xl text-gray-800">
              Join a <span className="text-violet-600">Game</span>
            </h1>
            <p className="px-6 mt-6 mb-12 text-lg text-gray-700 sm:px-12 lg:px-20">
              Enter a game code to join your friends and compete in fun,
              interactive quizzes powered by AI.
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
          </>
        ) : (
          <>
            <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl lg:text-6xl text-gray-800 mb-8">
              Welcome,{" "}
              <span className="text-violet-600">{localPlayerName}</span>!
            </h1>
            <div className="bg-white shadow-lg rounded-xl px-8 py-6 w-full max-w-lg text-left">
              <div className="space-y-4">
                <p className="text-lg text-gray-700 font-medium">
                  <strong>Game Code:</strong>{" "}
                  <span className="font-mono text-blue-600">
                    {localGameCode}
                  </span>
                </p>
                <p className="text-lg text-gray-700">
                  Hang tight! The host will start the game soon.
                </p>
                <div className="flex items-center justify-center space-x-2 pb-4">
                  <div
                    className="w-3 h-3 bg-purple-500 rounded-full animate-bounce"
                    style={{ animationDelay: "0s" }}
                  ></div>
                  <div
                    className="w-3 h-3 bg-purple-600 rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  ></div>
                  <div
                    className="w-3 h-3 bg-purple-700 rounded-full animate-bounce"
                    style={{ animationDelay: "0.4s" }}
                  ></div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="absolute inset-0 pointer-events-none">
        <svg
          className="absolute bottom-0 left-0 w-full"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 1440 400"
        >
          <path
            fill="#e5e7eb"
            d="M0,128L48,160C96,192,192,256,288,256C384,256,480,192,576,160C672,128,768,128,864,160C960,192,1056,256,1152,272C1248,288,1344,256,1392,240L1440,224L1440,400L1392,400C1344,400,1248,400,1152,400C1056,400,960,400,864,400C768,400,672,400,576,400C480,400,384,400,288,400C192,400,96,400,48,400L0,400Z"
          />
        </svg>
      </div>
    </section>
  );
};

export default JoinGame;
