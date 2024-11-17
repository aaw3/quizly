import { useState } from "react";
import axios from "axios";

interface QuizPromptInputProps {
  setGameCode: (value: string) => void;
  setQuizMade: (value: boolean) => void;
}

const QuizPromptInput: React.FC<QuizPromptInputProps> = ({
  setQuizMade,
  setGameCode,
}) => {
  const [prompt, setPrompt] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const maxChars = 100;

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (e.target.value.length <= maxChars) {
      setPrompt(e.target.value);
    }
  };

  const createGame = async (prompt: string) => {
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_PROTOCOL}://${import.meta.env.VITE_HOST}:${
          import.meta.env.VITE_PORT
        }/api/creategame?user_prompt=${prompt}`
      );
      const data = response.data;

      if (data.game_code) {
        setGameCode(data.game_code); // Set the game code
      } else {
        console.error(data.message || "Error creating game");
      }
    } catch (error) {
      console.error("Failed to create game:", error);
    }
  };

  const handleSubmit = () => {
    if (prompt.trim().length > 0) {
      if (prompt.trim().length < 15) {
        setError("Message is too short. Must be at least 15 characters.");
        setTimeout(() => {
          setError(null);
        }, 2000);
      } else {
        createGame(prompt);
        console.log("Submitting prompt:", prompt);
        setPrompt(""); // Clear the prompt after submission

        // Update the quizMade state
        setQuizMade(true);
      }
    }
  };

  return (
    <section className="relative bg-gradient-to-b from-violet-50 to-gray-50 min-h-screen pb-32">
      <div className="container mx-auto flex flex-col items-center px-4 text-center md:px-10 lg:px-32 max-w-5xl">
        {/* Title */}
        <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl lg:text-6xl text-gray-800">
          Generate a <span className="text-violet-600">Quiz</span>
        </h1>

        <p className="px-6 mt-6 mb-12 text-lg text-gray-700 sm:px-12 lg:px-20">
          Provide a prompt to let the AI craft a personalized quiz and launch a
          new game. Specify the number of questions.
        </p>

        {/* Input Field */}
        <div className="w-full max-w-5xl bg-white shadow-lg rounded-xl p-6 relative">
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
