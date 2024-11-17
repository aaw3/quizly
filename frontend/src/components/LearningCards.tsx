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
      icon: <FaBook size={32} className="text-black" />,
      bgColor: "bg-blue-600",
      textColor: "text-white",
      content: (
        <p className="text-sm font-medium">
          Get personalized feedback when you miss a question. Our AI identifies
          gaps and provides targeted help to boost your understanding.
        </p>
      ),
    },
    {
      title: "Study Smarter",
      icon: <FaClipboardList size={32} className="text-black" />,
      bgColor: "bg-violet-600",
      textColor: "text-white",
      content: (
        <p className="text-sm font-medium">
          Generate custom study guides with AI. Focus on topics you need the
          most help with, and learn efficiently.
        </p>
      ),
    },
    {
      title: "AI-Generated Questions",
      icon: <FaStickyNote size={32} className="text-black" />,
      bgColor: "bg-blue-500",
      textColor: "text-white",
      content: (
        <p className="text-sm font-medium">
          Let AI do the work! Automatically create challenging, tailored
          questions to enhance your learning experience.
        </p>
      ),
    },
    {
      title: "Track Your Progress",
      icon: <FaChartBar size={32} className="text-black" />,
      bgColor: "bg-violet-500",
      textColor: "text-white",
      content: (
        <p className="text-sm font-medium">
          Monitor your performance with detailed reports and progress tracking.
          Watch your skills improve over time!
        </p>
      ),
    },
  ];

  return (
    <section className="py-16 relative z-10 bg-gray-50">
      <div className="container mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 px-6">
        {cards.map((card, index) => (
          <div
            key={index}
            className={`rounded-xl shadow-lg hover:shadow-2xl transform hover:scale-105 transition-transform duration-300 p-6 max-w-[320px] min-h-[450px] flex flex-col justify-between ${
              card.bgColor
            } ${card.textColor || "text-gray-900"}`}
          >
            {/* Icon and Title */}
            <div className="text-center mb-6">
              <div className="mb-4 flex justify-center">
                <div className="w-14 h-14 flex items-center justify-center bg-white rounded-full shadow-md">
                  {card.icon}
                </div>
              </div>
              <h2 className="text-xl font-bold">{card.title}</h2>
            </div>

            {/* Content */}
            <div className="flex-grow flex items-center justify-center">
              {card.content}
            </div>

            {/* Footer CTA */}
            <div className="text-center mt-6">
              <button className="text-sm font-semibold bg-white text-blue-600 px-4 py-2 rounded-lg shadow-md hover:bg-gray-100 transition duration-200">
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
