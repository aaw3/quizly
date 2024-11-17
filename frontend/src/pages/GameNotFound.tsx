import { Link } from "react-router-dom";
import Header from "../components/Header";

const GameNotFound = () => {
  return (
    <section className="relative bg-gradient-to-b bg-white min-h-screen pb-96">
      <Header />
      <div className="container mx-auto flex flex-col items-center px-4 text-center py-20 md:px-10 lg:px-32 xl:max-w-4xl">
        <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl lg:text-6xl text-gray-800">
          Game <span className="text-red-600">Not Found</span>
        </h1>
        <p className="px-6 mt-6 mb-12 text-lg text-gray-700 sm:px-12 lg:px-20">
          We couldn’t find the game you’re looking for. Double-check your game
          code and try again, or create a new game to play with your friends.
        </p>

        <div className="w-full max-w-md space-x-4">
          <Link
            to="/joingame"
            className="w-full px-6 py-4 text-lg font-medium rounded-lg bg-violet-600 text-white shadow-lg hover:bg-violet-700 transition duration-200"
          >
            Join Game
          </Link>
          <Link
            to="/"
            className="w-full px-6 py-4 text-lg font-medium rounded-lg bg-blue-600 text-white shadow-lg hover:bg-blue-700 transition duration-200"
          >
            Go to Home
          </Link>
        </div>
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

export default GameNotFound;
