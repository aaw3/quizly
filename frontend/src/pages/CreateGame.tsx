import { useState, useEffect } from "react";
import axios from "axios";
import Header from "../components/Header";
import { IoCopy } from "react-icons/io5";

const CreateGame = () => {
  const [gameCode, setGameCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [players, setPlayers] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [socket, setSocket] = useState<WebSocket | null>(null);

  const createGame = async () => {
    setLoading(true);
    try {
      const response = await axios.post("http://localhost:8000/creategame");
      const data = response.data;

      if (data.game_code) {
        setGameCode(data.game_code);
      } else {
        console.error(data.message || "Error creating game");
      }
    } catch (error) {
      console.error("Failed to create game:", error);
    } finally {
      setLoading(false);
    }
  };

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
        `ws://localhost:8000/ws/host/${gameCode}`
      );

      newSocket.onopen = () => {
        console.log("WebSocket connection established for game:", gameCode);
        setSocket(newSocket);
      };

      newSocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.players) {
            setPlayers(data.players);
          } else {
            console.error("Unexpected message format:", data);
          }
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error);
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
      socket.send(message);
      console.log("Message sent:", message);
    } else {
      console.error("WebSocket is not open");
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <section className="relative bg-gradient-to-b from-violet-50 to-gray-50 min-h-screen pb-[340px]">
      <Header />
      <div className="container mx-auto flex flex-col items-center px-4 text-center py-20 md:px-10 lg:px-32 xl:max-w-4xl">
        {!gameCode ? (
          <>
            <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl lg:text-6xl text-gray-800">
              Create a <span className="text-blue-600">Game</span>
            </h1>
            <p className="px-6 mt-6 mb-12 text-lg text-gray-700 sm:px-12 lg:px-20">
              Use AI to create custom quizzes and start a new game for your
              friends or students.
            </p>

            <button
              onClick={createGame}
              disabled={loading}
              className="w-full max-w-md px-6 py-3 text-lg font-medium rounded-lg bg-blue-600 text-white shadow-lg hover:bg-blue-700 transition duration-200"
            >
              {loading ? "Creating..." : "Create Game"}
            </button>
          </>
        ) : (
          <>
            <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl lg:text-6xl text-gray-800 mb-8">
              Game <span className="text-blue-600">Created</span> Successfully!
            </h1>
            <div className="bg-white shadow-lg rounded-xl px-8 py-6 w-full max-w-lg text-left">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-lg text-gray-700 font-medium">
                    Game Code:{" "}
                    <span className="font-mono text-blue-600">{gameCode}</span>
                  </p>
                  <div className="flex flex-row space-x-1">
                    {copied && (
                      <p className="text-sm font-medium">
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
                  Share this join link:{" "}
                  <a
                    className="underline text-blue-500 hover:text-blue-700"
                    href={`http://localhost:5173/joingame`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    http://localhost:5173/joingame
                  </a>
                </p>
                <div className="flex justify-center mt-6">
                  <button
                    onClick={() => sendMessage("start")}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition duration-200"
                  >
                    Start Game
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-gray-100 shadow-lg rounded-xl px-8 py-6 w-full max-w-lg mt-8">
              <h3 className="text-2xl font-bold text-gray-800 mb-4">Players</h3>
              {players.length > 0 ? (
                <ul className="space-y-2">
                  {players.map((player, index) => (
                    <li
                      key={index}
                      className="text-lg text-gray-700 border-b border-gray-300 pb-2"
                    >
                      {player}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 mt-4">
                  No players have joined yet. Share the link to invite friends!
                </p>
              )}
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

export default CreateGame;
