import Header from "../components/Header";
import { FaGithub, FaLinkedin } from "react-icons/fa";

const About = () => {
  const creators = [
    {
      name: "Liam Stamper",
      github: "https://github.com/liamstamper",
      linkedin: "https://linkedin.com/in/liamstamper",
    },
    {
      name: "Allen Wolf",
      github: "https://github.com/aaw3",
      linkedin: "https://linkedin.com/in/allen-wolf",
    },
  ];

  return (
    <section className="relative bg-gradient-to-b from-gray-50 to-blue-50 min-h-screen pb-32">
      <Header />
      <div className="container mx-auto flex flex-col items-center px-4 text-center md:py-20 md:px-10 lg:px-32 xl:max-w-4xl">
        {/* Title */}
        <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl lg:text-6xl text-gray-800 mb-8">
          About <span className="text-violet-600">Quizly</span>
        </h1>

        {/* Description */}
        <p className="px-6 text-xl pb-8 text-gray-700 sm:px-12 lg:px-20">
          This project was proudly created for the Iowa State Hackathon by{" "}
          <span className="font-semibold text-violet-600">Liam Stamper</span> and{" "}
          <span className="font-semibold text-violet-600">Allen Wolf</span>. Connect with us on GitHub and Linkedin!
        </p>

        {/* Creator Profiles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mt-8">
          {creators.map((creator, index) => (
            <div
              key={index}
              className="flex flex-row items-center bg-white shadow-lg rounded-xl p-6 max-w-sm mx-auto gap-3"
            >
              <h3 className="text-2xl font-semibold text-blue-500">
                {creator.name}
              </h3>
              <div className="flex space-x-6">
                <a
                  href={creator.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-800 hover:text-blue-600 transition"
                  aria-label={`${creator.name} GitHub`}
                >
                  <FaGithub size={32} />
                </a>
                <a
                  href={creator.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-800 hover:text-blue-600 transition"
                  aria-label={`${creator.name} LinkedIn`}
                >
                  <FaLinkedin size={32} />
                </a>
              </div>
            </div>
          ))}
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

export default About;
