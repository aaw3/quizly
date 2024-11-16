import Header from "../components/Header";
import Hero from "../components/Hero";
import LearningCards from "../components/LearningCards";

const Home = () => {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 pb-20">
      <Header />
      <Hero />
      <div className="relative z-10">
        <LearningCards />
      </div>
    </div>
  );
};

export default Home;
