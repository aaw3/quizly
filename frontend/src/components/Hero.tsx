import { Link } from "react-router-dom";

const Hero = () => {
  return (
    <section className="relative bg-gradient-to-b from-blue-50 via-gray-100 to-gray-50 py-16">
      <div className="container mx-auto flex flex-col items-center px-4 text-center md:py-20 md:px-10 lg:px-32 xl:max-w-4xl">
        {/* Headline */}
        <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl lg:text-6xl text-gray-800">
          Quiz and Compete with{" "}
          <span className="text-violet-600">AI-powered learning</span>.
        </h1>

        {/* Subheading */}
        <p className="px-6 mt-6 mb-8 text-lg text-gray-700 sm:px-12 lg:px-20">
          Challenge your friends, master new topics, and level up your skills
          with <span className="text-violet-600">AI-driven quizzes</span> that
          adapt to you.
        </p>

        {/* Buttons */}
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            to="/joingame"
            className="px-8 py-3 text-lg font-medium rounded-lg bg-violet-600 text-white shadow-lg hover:bg-violet-700 transition duration-200"
          >
            Join Game
          </Link>
          <Link
            to="/"
            className="px-8 py-3 text-lg font-medium rounded-lg bg-blue-500 text-white shadow-lg hover:bg-blue-600 transition duration-200"
          >
            Create Game
          </Link>
        </div>
      </div>

      {/* Decorative Background */}
      <div className="absolute inset-0 pointer-events-none">
        <svg
          className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-10"
          width="1440"
          height="320"
          viewBox="0 0 1440 320"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M0,288L80,272C160,256,320,224,480,224C640,224,800,256,960,256C1120,256,1280,224,1360,208L1440,192L1440,320L1360,320C1280,320,1120,320,960,320C800,320,640,320,480,320C320,320,160,320,80,320L0,320Z"
            fill="#e5e7eb"
          />
        </svg>
      </div>
    </section>
  );
};

export default Hero;
