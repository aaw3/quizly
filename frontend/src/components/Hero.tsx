import { Link } from "react-router-dom";

const Hero = () => {
  return (
    <section className="dark:bg-gray-100 dark:text-gray-800">
      <div className="container mx-auto flex flex-col items-center px-4  text-center md:py-32 md:px-10 lg:px-32 xl:max-w-4xl">
        <h1 className="text-4xl font-bold leading-none sm:text-5xl">
          Quiz and Compete with{" "}
          <span className="text-violet-600">AI-powered learning</span>.
        </h1>
        <p className="px-8 mt-8 mb-12 text-lg">
          Challenge your friends, master new topics, and level up your skills
          with <span className="text-violet-600">AI-driven quizzes</span> that
          adapt to you.
        </p>
        <div className="flex flex-wrap justify-center">
          <Link
            to="/"
            className="px-8 py-3 m-2 text-lg font-semibold rounded bg-violet-600 text-gray-50"
          >
            Join Game
          </Link>
          <Link
            to="/"
            className="bg-blue-500 px-8 py-3 m-2 text-lg border rounded text-white"
          >
            Create Game
          </Link>
        </div>
      </div>
    </section>
  );
};

export default Hero;
