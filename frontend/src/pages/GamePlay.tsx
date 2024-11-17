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
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [showTransition, setShowTransition] = useState<boolean>(false);
  const [questionResult, setQuestionResult] = useState<boolean | null>(null);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [timesUp, setTimesUp] = useState<boolean>(false);
  const [totalQuestions, setTotalQuestions] = useState<number | null>(null);

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
        setIsPaused(true);
      } else if (event.data === "[RESUME]") {
        setIsPaused(false);
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
          const time = data.question.start_time;
          setTotalQuestions(data.question.total_questions);

          setStartTime(time);
          const calculatedTimeLeft = time + 30 - Math.floor(Date.now() / 1000);
          setTimeLeft(calculatedTimeLeft > 0 ? calculatedTimeLeft : 0);

          setQuestion(questionText);
          setAnswers(
            Object.entries(options).map(([key, value]) => ({
              text: `${key}: ${value}`,
            }))
          );

          setSelectedAnswer(null);
          setExplanation(null);
          setProgress((prev) => prev + 1);

          // Reset isCorrect here
          setIsCorrect(null);
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
    if (socket && !isPaused && !showTransition) {
      socket.send(answer.split(":")[0].trim().toUpperCase());
      setSelectedAnswer(answer);
    }
  };

  // Timer logic
  useEffect(() => {
    if (timeLeft !== null && timeLeft > 0 && !isPaused && !showTransition) {
      const timeoutDuration = timeLeft < 1 ? timeLeft * 1000 : 1000;

      const timer = setTimeout(() => {
        setTimeLeft((prev) => {
          if (prev !== null) {
            if (prev > 1) {
              return prev - 1;
            } else {
              return 0;
            }
          }
          return null;
        });
      }, timeoutDuration);

      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && selectedAnswer === null && !isPaused) {
      setIsCorrect(false);
      setTimesUp(true);
      setExplanation(`The correct answer was ${answers}`);
    }
  }, [timeLeft, selectedAnswer, isPaused, showTransition]);

  // Handle "Try Again" button click
  const handleTryAgain = () => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send("TRY_AGAIN");
      setSelectedAnswer(null);
      setIsCorrect(null);
      setExplanation(null);
    }
  };

  // Handle Transition Screen Logic
  useEffect(() => {
    if (isCorrect === true) {
      setQuestionResult(isCorrect);
      setShowTransition(true);

      const timer = setTimeout(() => {
        setShowTransition(false);
        setQuestionResult(null);

        // Send a message to get the next question
        if (socket && socket.readyState === WebSocket.OPEN) {
          socket.send("NEXT_QUESTION");
        }

        // Reset isCorrect here
        setIsCorrect(null);
        setSelectedAnswer(null);
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [isCorrect, socket]);

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
            <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
              <div className="bg-white rounded-2xl px-10 py-8 text-center shadow-xl max-w-md">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">
                  Game Paused
                </h2>
                <p className="text-lg text-gray-600 mb-6">
                  The host has paused the game. Take a moment to relax.
                </p>
              </div>
            </div>
          )}
          {/* Transition Screen */}
          {showTransition && (
            <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
              <div className="bg-white rounded-2xl px-10 py-8 text-center shadow-xl max-w-md">
                <h2
                  className={`text-3xl font-bold mb-4 ${
                    questionResult ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {questionResult ? "Correct Answer!" : "Incorrect Answer!"}
                </h2>
                <p className="text-lg text-gray-700 mb-6">
                  {questionResult
                    ? "Great job! Get ready for the next question."
                    : "Don't worry! Try the next one."}
                </p>
              </div>
            </div>
          )}

          {/* Content */}
          <div className="relative z-10 container mx-auto flex flex-col items-center px-4 text-center py-20 md:px-10 lg:px-32 xl:max-w-4xl">
            <div className="flex justify-between items-center w-full max-w-2xl mb-4">
              <p className="text-lg font-medium text-gray-700">
                Question {progress}/{totalQuestions}
              </p>
              <p className="text-lg font-medium text-gray-700">
                Time Left:{" "}
                {timeLeft !== null ? Math.max(Math.floor(timeLeft), 0) : 0}
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
                  disabled={
                    selectedAnswer !== null || isPaused || showTransition
                  }
                >
                  {answer.text}
                </button>
              ))}
            </div>

            {explanation && (
              <div className="bg-gray-100 shadow-lg rounded-xl px-8 py-6 w-full max-w-2xl mt-8">
                {timesUp ? (
                  <h3 className="text-xl font-bold text-gray-800 mb-2">
                    Time's Up!
                  </h3>
                ) : (
                  <h3 className="text-xl font-bold text-gray-800 mb-2">
                    AI Explanation
                  </h3>
                )}
                <p className="text-lg text-gray-700">{explanation}</p>
                {!timesUp && (
                  <button
                    onClick={handleTryAgain}
                    className="bg-blue-600 px-6 py-3 text-white rounded-lg my-4"
                  >
                    Try Again
                  </button>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
};

export default GamePlay;
