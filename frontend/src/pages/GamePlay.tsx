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
  const [progress, setProgress] = useState(1); // Question number

  useEffect(() => {
    if (!gameCode || !playerName) return;

    const ws = new WebSocket(
      `ws://localhost:8000/ws/game/${gameCode}/${playerName}`
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
      try {
        setQuestion(event.data);
        const data = JSON.parse(event.data);
        console.log("Parsed data:", data);

        if (data.question) {
          // Handle new question
          const questionText = data.question.question;
          const options = data.question.options;

          setQuestion(questionText);
          setAnswers(
            Object.entries(options).map(([key, value]) => ({
              text: `${key}: ${value}`,
            }))
          );

          // Reset states for new question
          setSelectedAnswer(null);
          setIsCorrect(null);
          setExplanation(null);
          setTimeLeft(30);
          setProgress((prev) => prev + 1);
        } else if (data.result) {
          // Handle result after submitting an answer
          setIsCorrect(data.result === "correct");
          setExplanation(data.explanation || "");
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
    if (socket) {
      socket.send(JSON.stringify({ answer }));
      setSelectedAnswer(answer);
    }
  };

  // Timer countdown
  useEffect(() => {
    if (timeLeft > 0 && selectedAnswer === null) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && selectedAnswer === null) {
      setIsCorrect(false);
      setExplanation(
        "Time's up! The correct answer will be displayed shortly."
      );
    }
  }, [timeLeft, selectedAnswer]);

  return (
    <section className="relative bg-gradient-to-b from-violet-50 to-gray-50 min-h-screen">
      {/* Header */}
      <Header />

      {/* Content */}
      <div className="relative z-10 container mx-auto flex flex-col items-center px-4 text-center py-20 md:px-10 lg:px-32 xl:max-w-4xl">
        {/* Progress and Timer */}
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

        {/* Question */}
        <div className="bg-white shadow-lg rounded-xl px-8 py-6 w-full max-w-2xl min-h-64 mb-6">
          <h2 className="text-2xl font-bold text-gray-800">{question}</h2>
        </div>

        {/* Answer Options */}
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
              disabled={selectedAnswer !== null}
            >
              {answer.text}
            </button>
          ))}
        </div>

        {/* AI Explanation Box */}
        {explanation && (
          <div className="bg-gray-100 shadow-lg rounded-xl px-8 py-6 w-full max-w-2xl mt-8">
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              AI Explanation
            </h3>
            <p className="text-lg text-gray-700">{explanation}</p>
          </div>
        )}

        {/* Correct/Incorrect Feedback */}
        {isCorrect !== null && (
          <div className="mt-8 flex flex-row items-center space-x-4 justify-center">
            <div
              className={`px-6 py-3 rounded-lg font-medium text-lg ${
                isCorrect ? "bg-green-500 text-white" : "bg-red-500 text-white"
              }`}
            >
              {isCorrect ? "Correct!" : "Incorrect!"}
            </div>
          </div>
        )}
        {socket === null && (
          <div className="text-center mt-10">
            <p className="text-red-500">
              Connection to the game failed. Retrying...
            </p>
          </div>
        )}
      </div>
    </section>
  );
};

export default GamePlay;
