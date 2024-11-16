import { useState, useEffect } from "react";
import Header from "../components/Header";

const GamePlay = () => {
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(30); // Timer (30 seconds)
  const [progress, setProgress] = useState(3); // Progress (e.g., Question 3/10)

  const question = "What is the capital of France?";
  const answers = [
    { text: "Berlin", isCorrect: false },
    { text: "Madrid", isCorrect: false },
    { text: "Paris", isCorrect: true },
    { text: "Rome", isCorrect: false },
  ];
  const category = "Geography";
  // Handle answer
  const handleAnswerClick = (answer: { text: string; isCorrect: boolean }) => {
    setSelectedAnswer(answer.text);
    setIsCorrect(answer.isCorrect);
    if (!answer.isCorrect) {
      setExplanation(
        "The capital of France is Paris. Berlin is the capital of Germany."
      );
    } else {
      setExplanation(null);
    }
  };

  // Timer countdown
  useEffect(() => {
    if (timeLeft > 0 && selectedAnswer === null) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && selectedAnswer === null) {
      setIsCorrect(false);
      setExplanation("Time's up! The correct answer is Paris.");
    }
  }, [timeLeft, selectedAnswer]);

  return (
    <section className="relative bg-gradient-to-b from-violet-50 to-gray-50 min-h-screen">
      {/* Header */}
      <Header />

      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <svg
          className="absolute bottom-0 left-0 w-full"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 1440 400"
          preserveAspectRatio="none"
        >
          <path
            fill="#e5e7eb"
            d="M0,128L48,160C96,192,192,256,288,256C384,256,480,192,576,160C672,128,768,128,864,160C960,192,1056,256,1152,272C1248,288,1344,256,1392,240L1440,224L1440,400L1392,400C1344,400,1248,400,1152,400C1056,400,960,400,864,400C768,400,672,400,576,400C480,400,384,400,288,400C192,400,96,400,48,400L0,400Z"
          />
        </svg>
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto flex flex-col items-center px-4 text-center py-20 md:px-10 lg:px-32 xl:max-w-4xl">
        {/* Progress and Timer */}
        <div className="flex justify-between items-center w-full max-w-2xl mb-4">
          <p className="text-lg font-medium text-gray-700">
            Category: {category}
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
              onClick={() => handleAnswerClick(answer)}
              className={`w-full px-6 py-3 text-lg font-medium rounded-lg shadow transition duration-200 ${
                selectedAnswer === answer.text
                  ? isCorrect
                    ? "bg-green-500 text-white"
                    : "bg-red-500 text-white"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
              disabled={selectedAnswer !== null} // Disable buttons after selecting an answer
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

        {/* Correct/Incorrect Feedback and Try Again */}
        {isCorrect !== null && (
          <div className="mt-8 flex flex-row items-center space-x-4 justify-center">
            <div
              className={`px-6 py-3 rounded-lg font-medium text-lg ${
                isCorrect ? "bg-green-500 text-white" : "bg-red-500 text-white"
              }`}
            >
              {isCorrect ? "Correct!" : "Incorrect!"}
            </div>
            {!isCorrect && (
              <button
                onClick={() => {
                  setSelectedAnswer(null);
                  setIsCorrect(null);
                  setExplanation(null);
                }}
                className="px-6 py-3 text-lg font-medium rounded-lg bg-blue-600 text-white shadow-lg hover:bg-blue-700 transition duration-200"
              >
                Try Again
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default GamePlay;
