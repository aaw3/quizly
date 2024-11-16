import React from "react";
import { useLocation } from "react-router-dom";
import { Link } from "react-router-dom";

const Header: React.FC = () => {
  const location = useLocation();
  return (
    <header className="bg-blue-600 text-white">
      <div className="container mx-auto flex justify-between items-center py-2 px-4">
        <div className="flex items-center space-x-4">
          <Link to="/" className="text-2xl font-bold">
            Quizly
          </Link>
          {location.pathname === "/creategame" && (
            <div className="text-sm bg-gray-100 text-blue-600 px-2 py-1 rounded">
              TEACHER
            </div>
          )}
        </div>
        <div className="flex items-center space-x-4">
          <Link to="/" className="text-white  transition duration-200">
            About
          </Link>
          <Link to="/" className="text-white  transition duration-200">
            Your Games
          </Link>
          <div className="w-10 h-10 rounded-full bg-gray-300"></div>
        </div>
      </div>
    </header>
  );
};

export default Header;
