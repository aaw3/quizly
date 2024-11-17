import { useState, useEffect } from "react";
import Header from "../components/Header";
import { IoCopy } from "react-icons/io5";
import QuizPromptInput from "../components/QuizPromptInput";

interface PlayerMetric {
  score: number;
  avg_score: number;
  correct_questions: number[];
  incorrect_questions: number[];
  remaining_questions: number[];
  github_avatar?: string;
}

interface GameMetrics {
  game_data: {
    code: string;
    start_time: number | null;
  };
  player_metrics: Record<string, PlayerMetric>;
}

const CreateGame = () => {
  const [gameCode, setGameCode] = useState<string | null>(null);
  const [error, setError] = useState<boolean>(false);
  const [players, setPlayers] = useState<string[]>([]);
  const [metrics, setMetrics] = useState<GameMetrics | null>(null);
  const [copied, setCopied] = useState(false);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [gamePaused, setGamePaused] = useState<boolean>(false);
  const [gameEnded, setGameEnded] = useState<boolean>(false);
  const [quizMade, setQuizMade] = useState<boolean>(false);

  const copyToClipboard = () => {
    if (gameCode) {
      navigator.clipboard.writeText(gameCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1000); // Reset after 1 second
    }
  };

  useEffect(() => {
    if (gameCode) {
      const newSocket = new WebSocket(
        `${import.meta.env.VITE_WS_PROTOCOL}://${import.meta.env.VITE_HOST}:${
          import.meta.env.VITE_PORT
        }/ws/host/${gameCode}`
      );

      newSocket.onopen = () => {
        console.log("WebSocket connection established for game:", gameCode);
        setSocket(newSocket);
      };

      newSocket.onmessage = (event) => {
        console.log("WebSocket message received:", event.data);
        try {
          const data = JSON.parse(event.data);

          if (data.metrics) {
            setMetrics(data.metrics);
            const playerNames = Object.keys(data.metrics.player_metrics);
            setPlayers(playerNames);
          } else if (data.type === "info" && data.message === "[START]") {
            setGameStarted(true);
          } else {
            console.error("Unexpected message format:", data);
          }
        } catch (error) {
          console.warn("Non-JSON WebSocket message:", event.data);
        }
      };

      newSocket.onclose = () => {
        console.log("WebSocket connection closed");
      };

      return () => {
        newSocket.close();
      };
    }
  }, [gameCode]);

  const sendMessage = (message: string) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      if (message === "start" && (!players || players.length === 0)) {
        setError(true);
        setTimeout(() => setError(false), 2000);
      } else {
        socket.send(message);
        console.log("Message sent:", message);
        if (message === "start") {
          setGameStarted(true);
        }
        if (message === "end") {
          setGameEnded(true);
        }
        if (message === "pause") {
          setGamePaused(true);
        }
      }
    } else {
      console.error("WebSocket is not open");
    }
  };

  // Scroll to top
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Get initials
  const getPlayerInitials = (name: string): string => {
    const initials = name
      .split(" ")
      .map((word) => word[0]?.toUpperCase())
      .join("");
    return initials || "?"; // Fallback to '?' if no initials can be derived
  };

  // Helper to generate a consistent color based on the player's name
  const getPlayerColor = (name: string): string => {
    const hash = name
      .split("")
      .reduce((acc, char) => char.charCodeAt(0) + acc, 0);
    const colors = [
      "bg-red-500",
      "bg-green-500",
      "bg-blue-500",
      "bg-yellow-500",
      "bg-purple-500",
    ];
    return colors[hash % colors.length];
  };

  return (
    <section className="relative bg-gradient-to-b from-violet-50 to-gray-50 min-h-screen pb-[340px]">
      <Header />
      <div className="container mx-auto flex flex-col items-center px-4 text-center py-20 md:px-10 lg:px-32 xl:max-w-6xl">
        {!gameCode ? (
          <QuizPromptInput
            setGameCode={setGameCode}
            setQuizMade={setQuizMade}
          />
        ) : (
          <>
            {" "}
            {!gameEnded ? (
              <>
                <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl lg:text-6xl text-gray-800 mb-8">
                  Game <span className="text-blue-600">Created</span>{" "}
                  Successfully!
                </h1>
                <div className="bg-white shadow-lg rounded-xl px-8 py-6 w-full max-w-lg text-left">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-lg text-gray-700 font-medium">
                        <span className="font-bold">Game Code: </span>
                        <span className="font-mono text-blue-600">
                          {gameCode}
                        </span>
                      </p>
                      <div className="flex flex-row space-x-1">
                        {copied && (
                          <p className="text-gray-600 text-xs pt-[3px]">
                            Copied to clipboard!
                          </p>
                        )}
                        <button
                          onClick={copyToClipboard}
                          className="flex items-center justify-center text-blue-600 hover:text-blue-800 transition duration-200"
                          title="Copy to clipboard"
                        >
                          <IoCopy size={20} />
                        </button>
                      </div>
                    </div>

                    <p className="text-lg text-gray-700">
                      <a
                        className="underline font-bold text-blue-500 hover:text-blue-700"
                        href={`http://localhost:5173/joingame`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        http://{import.meta.env.VITE_HOST}:
                        {import.meta.env.VITE_PORT}/joingame
                      </a>
                    </p>
                    <div className="flex justify-center mt-6">
                      {gameStarted === false ? (
                        <button
                          onClick={() => sendMessage("start")}
                          className="px-6 py-3 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition duration-200"
                        >
                          Start Game
                        </button>
                      ) : (
                        <div className="flex flex-row space-x-4">
                          <button
                            onClick={() => {
                              sendMessage(gamePaused ? "resume" : "pause");
                              setGamePaused(!gamePaused);
                            }}
                            className={`px-6 py-3 ${
                              gamePaused
                                ? "bg-blue-600 hover:bg-blue-700"
                                : "bg-blue-600 hover:bg-blue-700"
                            } text-white rounded-lg shadow transition duration-200`}
                          >
                            {gamePaused ? "Resume Game" : "Pause Game"}
                          </button>

                          <button
                            onClick={() => sendMessage("end")}
                            className="px-6 py-3 bg-red-600 text-white rounded-lg shadow hover:bg-red-700 transition duration-200"
                          >
                            End Game
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-white shadow-lg rounded-xl px-8 py-6 w-full max-w-lg mt-8">
                  {!gameStarted ? (
                    <>
                      <h3 className="text-2xl font-bold text-gray-800 mb-4">
                        Players in Game
                      </h3>
                      {players.length > 0 ? (
                        <ul className="space-y-2">
                          {players.map((player, index) => (
                            <li
                              key={index}
                              className="flex items-center text-lg text-gray-700 border-b border-gray-300 pb-2"
                            >
                              {/* Show GitHub avatar if available, otherwise placeholder */}
                              {metrics?.player_metrics[player]
                                ?.github_avatar ? (
                                <img
                                  src={
                                    metrics.player_metrics[player].github_avatar
                                  }
                                  alt={`${player}'s avatar`}
                                  className="w-8 h-8 rounded-full mr-4"
                                />
                              ) : (
                                <div
                                  className={`w-8 h-8 rounded-full mr-4 flex items-center justify-center text-white font-bold ${getPlayerColor(
                                    player
                                  )}`}
                                >
                                  {getPlayerInitials(player)}
                                </div>
                              )}
                              {player}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-gray-500 mt-4">
                          No players have joined yet. Share the link to invite
                          friends!
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <h3 className="text-2xl font-bold text-gray-800 mb-4">
                        Leaderboard
                      </h3>
                      {metrics ? (
                        <div className="space-y-4">
                          {Object.entries(metrics.player_metrics).map(
                            ([name, data], index) => (
                              <div
                                key={index}
                                className="flex justify-between items-center bg-gray-100 px-6 py-4 rounded-lg shadow"
                              >
                                <div className="flex items-center">
                                  {/* Show GitHub avatar if available, otherwise initials */}
                                  {data.github_avatar ? (
                                    <img
                                      src={data.github_avatar}
                                      alt={`${name}'s avatar`}
                                      className="w-8 h-8 rounded-full mr-4"
                                    />
                                  ) : (
                                    <div
                                      className={`w-8 h-8 rounded-full mr-4 flex items-center justify-center text-white font-bold ${getPlayerColor(
                                        name
                                      )}`}
                                    >
                                      {getPlayerInitials(name)}
                                    </div>
                                  )}
                                  <span className="font-medium text-gray-700">
                                    {name}
                                  </span>
                                </div>
                                <span className="font-bold text-blue-600">
                                  {data.score} pts
                                </span>
                              </div>
                            )
                          )}
                        </div>
                      ) : (
                        <p className="text-gray-500">
                          Waiting for game metrics...
                        </p>
                      )}
                    </>
                  )}
                </div>
                {error && (
                  <p className="text-red-500 mt-4">
                    You cannot start the game without players!
                  </p>
                )}
              </>
            ) : (
              <div className="bg-white shadow-lg rounded-xl px-8 py-6 w-full max-w-2xl text-center">
                <h2 className="text-4xl font-bold text-gray-800 mb-4">
                  Game Over
                </h2>
                <p className="text-lg text-gray-700 mb-6">
                  Thanks for playing!
                </p>
                <p className="text-2xl font-bold text-blue-600 mb-6">
                  Final Scores:
                </p>
                <ul className="space-y-2">
                  {metrics &&
                    Object.entries(metrics.player_metrics)
                      .sort(([, a], [, b]) => b.score - a.score) // Sort by score in descending order
                      .map(([name, data], index) => (
                        <li
                          key={index}
                          className="flex items-center justify-between text-lg text-gray-700 border-b border-gray-300 pb-2"
                        >
                          <div className="flex items-center">
                            {/* Show GitHub avatar if available, otherwise fallback to initials */}
                            {data.github_avatar ? (
                              <img
                                src={data.github_avatar}
                                alt={`${name}'s avatar`}
                                className="w-8 h-8 rounded-full mr-4"
                              />
                            ) : (
                              <div
                                className={`w-8 h-8 rounded-full mr-4 flex items-center justify-center text-white font-bold ${getPlayerColor(
                                  name
                                )}`}
                              >
                                {getPlayerInitials(name)}
                              </div>
                            )}
                            {name}
                          </div>
                          <div>{data.score}</div>
                        </li>
                      ))}
                </ul>

                <button
                  onClick={() => window.location.reload()} // Reload page to restart
                  className="px-6 py-3 bg-violet-600 text-white rounded-lg shadow hover:bg-violet-700 transition duration-200 mt-6"
                >
                  Play Again
                </button>
              </div>
            )}
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

export default CreateGame;
