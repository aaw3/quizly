import { useEffect, useState } from "react";
import axios from "axios";
import Header from "../components/Header";

const JoinGame = () => {
  const [gameCode, setGameCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [gameData, setGameData] = useState<null | {
    message: string;
    player_name: string;
    game_code: string;
  }>(null);
  const [error, setError] = useState<string | null>(null);

  const joinGame = async () => {
    setError(null);
    try {
      const response = await axios.post(
        `http://localhost:8000/joingame/${gameCode}?player_name=${playerName}`
      );
      setGameData(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || "Error joining game");
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <section className="relative bg-gradient-to-b from-blue-50 to-gray-50 min-h-screen pb-96">
      <Header />
      <div className="container mx-auto flex flex-col items-center px-4 text-center py-20 md:px-10 lg:px-32 xl:max-w-4xl">
        {!gameData ? (
          <>
            {/* Page Title */}
            <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl lg:text-6xl text-gray-800">
              Join a <span className="text-violet-600">Game</span>
            </h1>
            <p className="px-6 mt-6 mb-12 text-lg text-gray-700 sm:px-12 lg:px-20">
              Enter a game code to join your friends and compete in fun,
              interactive quizzes powered by AI.
            </p>

            {/* Inputs and Join Button */}
            <div className="w-full max-w-md space-y-4">
              <input
                type="text"
                placeholder="Enter Game Code"
                value={gameCode}
                onChange={(e) => setGameCode(e.target.value)}
                className="w-full px-6 py-4 text-lg rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200"
              />
              <input
                type="text"
                placeholder="Enter Your Name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="w-full px-6 py-4 text-lg rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200"
              />
              <button
                onClick={joinGame}
                className="w-full px-6 py-3 text-lg font-medium rounded-lg bg-violet-600 text-white shadow-lg hover:bg-violet-700 transition duration-200"
              >
                Join Game
              </button>
            </div>

            {/* Error Message */}
            {error && <p className="text-red-500 mt-4">{error}</p>}
          </>
        ) : (
          <>
            {/* Success Message */}
            <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl lg:text-6xl text-gray-800 mb-8">
              Welcome,{" "}
              <span className="text-violet-600">{gameData.player_name}</span>!
            </h1>
            <div className="bg-white shadow-lg rounded-xl px-8 py-6 w-full max-w-lg text-left">
              <div className="space-y-4">
                <p className="text-lg text-gray-700 font-medium">
                  <strong>Game Code:</strong>{" "}
                  <span className="font-mono text-blue-600">
                    {gameData.game_code}
                  </span>
                </p>
                <p className="text-lg text-gray-700">
                  Waiting for the game to start...
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Decorative Background */}
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
