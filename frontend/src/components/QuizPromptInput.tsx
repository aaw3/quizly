import { useState } from "react";

const QuizPromptInput = () => {
  const [prompt, setPrompt] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const maxChars = 100;

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (e.target.value.length <= maxChars) {
      setPrompt(e.target.value);
    }
  };

  const handleSubmit = () => {
    if (prompt.trim().length > 0) {
      if (prompt.trim().length < 15) {
        setError("Message is too short. Must be atleast 15 characters.");
        setTimeout(() => {
          setError(null);
        }, 2000);
      } else {
        // Replace with your logic to send the prompt to the AI
        console.log("Submitting prompt:", prompt);
        setPrompt(""); // Clear the prompt after submission
      }
    }
  };

  return (
    <section className="relative bg-gradient-to-b from-violet-50 to-gray-50 min-h-screen pb-32">
      <div className="container mx-auto flex flex-col items-center px-4 text-center md:py-20 md:px-10 lg:px-32 xl:max-w-4xl">
        {/* Title */}
        <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl lg:text-6xl text-gray-800">
          Generate a <span className="text-violet-600">Quiz</span>
        </h1>

        <p className="px-6 mt-6 mb-12 text-lg text-gray-700 sm:px-12 lg:px-20">
          Provide a prompt to let AI craft personalized quizzes and launch a new
          game.
        </p>

        {/* Input Field */}
        <div className="w-full max-w-3xl bg-white shadow-lg rounded-xl p-6 relative">
          <textarea
            value={prompt}
            onChange={handleInputChange}
            placeholder="Enter your quiz prompt here..."
            className="w-full h-40 p-4 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {/* Character Limit */}
          <div className="absolute bottom-2 right-4 text-sm text-gray-500">
            {prompt.length}/{maxChars}
          </div>
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={prompt.trim().length === 0}
          className="mt-6 px-6 py-3 bg-violet-600 text-white rounded-lg shadow hover:bg-violet-700 transition duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          Generate Quiz
        </button>
        {error && <p className="text-red-500 mt-2">{error}</p>}
      </div>
    </section>
  );
};

export default QuizPromptInput;
