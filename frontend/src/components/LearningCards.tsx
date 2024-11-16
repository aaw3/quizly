import {
  FaBook,
  FaClipboardList,
  FaStickyNote,
  FaChartBar,
} from "react-icons/fa";

const LearningCards = () => {
  const cards = [
    {
      title: "AI-Driven Learning",
      icon: <FaBook size={24} />,
      bgColor: "bg-blue-600",
      textColor: "text-white",
      content: (
        <div className="text-center">
          <p className="text-lg font-semibold">
            Get personalized feedback when you miss a question. Our AI
            identifies gaps and provides targeted help to boost your
            understanding.
          </p>
        </div>
      ),
    },
    {
      title: "Study Smarter",
      icon: <FaClipboardList size={24} />,
      bgColor: "bg-violet-600",
      textColor: "text-white",
      content: (
        <div className="text-center">
          <p className="text-lg font-semibold">
            Generate custom study guides with AI. Focus on topics you need the
            most help with, and learn efficiently.
          </p>
        </div>
      ),
    },
    {
      title: "AI-Generated Questions",
      icon: <FaStickyNote size={24} />,
      bgColor: "bg-blue-500",
      textColor: "text-white",
      content: (
        <div className="text-center">
          <p className="text-lg font-semibold">
            Let AI do the work! Automatically create challenging, tailored
            questions to enhance your learning experience.
          </p>
        </div>
      ),
    },
    {
      title: "Track Your Progress",
      icon: <FaChartBar size={24} />,
      bgColor: "bg-violet-500",
      textColor: "text-white",
      content: (
        <div className="text-center">
          <p className="text-lg font-semibold">
            Monitor your performance with detailed reports and progress
            tracking. Watch your skills improve over time!
          </p>
        </div>
      ),
    },
  ];

  return (
    <section className="py-16 relative z-10">
      <div className="container mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 px-6">
        {cards.map((card, index) => (
          <div
            key={index}
            className={`rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition duration-300 p-6 max-w-[320px] min-h-[450px] flex flex-col justify-between ${
              card.bgColor
            } ${card.textColor || "text-gray-900"}`}
          >
            {/* Icon and Title */}
            <div className="text-center">
              <div className="mb-4 flex justify-center">{card.icon}</div>
              <h2 className="text-2xl font-bold">{card.title}</h2>
            </div>

            {/* Content */}
            <div className="flex-grow flex items-center justify-center">
              {card.content}
            </div>

            {/* Footer CTA */}
            <div className="text-center mt-6">
              <button className="text-sm font-semibold bg-white text-blue-600 px-4 py-2 rounded-lg shadow hover:bg-gray-100 transition duration-200">
                Explore More
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default LearningCards;
