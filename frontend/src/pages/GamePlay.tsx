import { useState, useEffect } from "react";
import { useGameContext } from "../components/GameContext";
import Header from "../components/Header";

const GamePlay = () => {
  const { gameCode, playerName } = useGameContext();
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [question, setQuestion] = useState<string | null>(null);
  const [answers, setAnswers] = useState<
    { text: string; isCorrect?: boolean }[]
  >([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(30);
  const [progress, setProgress] = useState<number>(1); // Question number
  const [score, setScore] = useState<number | null>(null);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false); // New Pause State

  useEffect(() => {
    if (!gameCode || !playerName) return;

    const ws = new WebSocket(
      `${import.meta.env.VITE_WS_PROTOCOL}://${import.meta.env.VITE_HOST}:${
        import.meta.env.VITE_PORT
      }/ws/game/${gameCode}/${playerName}`
    );

    ws.onopen = () => {
      console.log("WebSocket connection established.");
      setSocket(ws);
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      ws.close();
      setSocket(null);
    };

    ws.onclose = (event) => {
      console.warn("WebSocket connection closed:", event);
      setSocket(null);
    };

    ws.onmessage = (event) => {
      console.log("Received WebSocket message:", event.data);
      if (event.data === "[END]" || event.data === "[ALL_QUESTIONS_ANSWERED]") {
        setGameOver(true);
      } else if (event.data === "[PAUSE]") {
        setIsPaused(true); // Pause the game
      } else if (event.data === "[RESUME]") {
        setIsPaused(false); // Resume the game
      }
      try {
        const data = JSON.parse(event.data);
        console.log("Parsed data:", data);
        if (data.help) {
          setExplanation(data.help);
        }

        if (data.question) {
          const questionText = data.question.question;
          const options = data.question.options;

          setQuestion(questionText);
          setAnswers(
            Object.entries(options).map(([key, value]) => ({
              text: `${key}: ${value}`,
            }))
          );

          setSelectedAnswer(null);
          setIsCorrect(null);
          setExplanation(null);
          setTimeLeft(30);
          setProgress((prev) => prev + 1);
        } else if (data.attempt) {
          setIsCorrect(data.attempt.correct);
          if (data.attempt.final && !data.attempt.correct) {
            setExplanation("The correct answer will be displayed soon.");
          }
        } else {
          console.warn("Unhandled WebSocket message format:", data);
        }
      } catch (err) {
        console.error("Error processing WebSocket message:", err);
      }
    };

    return () => {
      ws.close();
      setSocket(null);
    };
  }, [gameCode, playerName]);

  // Handle answer submission
  const handleAnswerClick = (answer: string) => {
    if (socket && !isPaused) {
      socket.send(answer.split(":")[0].trim().toUpperCase());
      setSelectedAnswer(answer);
    }
  };

  // Timer countdown
  useEffect(() => {
    if (timeLeft > 0 && selectedAnswer === null && !isPaused) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && selectedAnswer === null && !isPaused) {
      setIsCorrect(false);
      setExplanation(
        "Time's up! The correct answer will be displayed shortly."
      );
    }
  }, [timeLeft, selectedAnswer, isPaused]);

  // Handle Pause/Resume
  const togglePause = () => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(isPaused ? "RESUME" : "PAUSE");
      setIsPaused(!isPaused);
    }
  };

  // Handle "Try Again" button click
  const handleTryAgain = () => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send("TRY_AGAIN"); // Send a "TRY_AGAIN" message to the server
      setSelectedAnswer(null); // Reset selected answer
      setIsCorrect(null); // Reset correctness status
      setExplanation(null); // Clear explanation
      setTimeLeft(30); // Reset timer for the question
    }
  };

  return (
    <section className="relative bg-gradient-to-b from-violet-50 to-gray-50 min-h-screen">
      <Header />
      {gameOver ? (
        <div className="bg-white shadow-lg rounded-xl px-8 py-6 w-full max-w-2xl mx-auto mt-20 text-center">
          <h2 className="text-4xl font-bold text-gray-800 mb-4">Game Over</h2>
          <p className="text-lg text-gray-700 mb-6">
            Thanks for playing,{" "}
            <span className="font-semibold">{playerName}</span>!
          </p>
          <p className="text-2xl font-bold text-blue-600 mb-6">
            Your Final Score: {score} pts
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-violet-600 text-white rounded-lg shadow hover:bg-violet-700 transition duration-200"
          >
            Play Again
          </button>
        </div>
      ) : (
        <>
          {/* Pause Overlay */}
          {isPaused && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl px-8 py-6 text-center shadow-lg max-w-sm">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">
                  Game Paused
                </h2>
                <p className="text-lg text-gray-600 mb-6">
                  The host has paused the game. Take a moment to relax.
                </p>
              </div>
            </div>
          )}

          {/* Content */}
          <div className="relative z-10 container mx-auto flex flex-col items-center px-4 text-center py-20 md:px-10 lg:px-32 xl:max-w-4xl">
            <div className="flex justify-between items-center w-full max-w-2xl mb-4">
              <p className="text-lg font-medium text-gray-700">
                Question {progress}/10
              </p>
              <p className="text-lg font-medium text-gray-700">
                Time Left: {timeLeft}s
              </p>
            </div>
            <div className="w-full max-w-2xl bg-gray-200 h-2 rounded-lg overflow-hidden mb-6">
              <div
                className="bg-blue-600 h-full transition-all"
                style={{ width: `${(progress / 10) * 100}%` }}
              ></div>
            </div>

            <div className="bg-white shadow-lg rounded-xl px-8 py-6 w-full max-w-2xl min-h-64 mb-6">
              <h2 className="text-2xl font-bold text-gray-800">{question}</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
              {answers.map((answer, index) => (
                <button
                  key={index}
                  onClick={() => handleAnswerClick(answer.text)}
                  className={`w-full px-6 py-3 text-lg font-medium rounded-lg shadow transition duration-200 ${
                    selectedAnswer === answer.text
                      ? isCorrect
                        ? "bg-green-500 text-white"
                        : "bg-red-500 text-white"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                  disabled={selectedAnswer !== null || isPaused}
                >
                  {answer.text}
                </button>
              ))}
            </div>

            {explanation && (
              <div className="bg-gray-100 shadow-lg rounded-xl px-8 py-6 w-full max-w-2xl mt-8">
                <h3 className="text-xl font-bold text-gray-800 mb-2">
                  AI Explanation
                </h3>
                <p className="text-lg text-gray-700">{explanation}</p>
                <button
                  onClick={handleTryAgain}
                  className="bg-blue-600 px-6 py-3 text-white rounded-lg my-4"
                >
                  Try Again
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
};

export default GamePlay;
