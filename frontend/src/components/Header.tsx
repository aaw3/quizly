import React from "react";
import { useLocation } from "react-router-dom";
import { Link } from "react-router-dom";
import ContextMenu from "./ContextMenu";

const Header: React.FC = () => {
  const location = useLocation();
  const handleLogout = () => {
    console.log("User logged out");
  };
  return (
    <header className="bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-md">
      <div className="container mx-auto flex justify-between items-center py-3 px-6 lg:px-10">
        {/* Logo and Conditional Badge */}
        <div className="flex items-center space-x-4">
          <Link
            to="/"
            className="text-3xl font-extrabold tracking-wide hover:opacity-90 transition duration-200"
          >
            Quizly
          </Link>
          {location.pathname === "/creategame" && (
            <div className="text-xs font-semibold bg-white text-blue-600 px-3 py-1 rounded-lg shadow-sm">
              TEACHER
            </div>
          )}
        </div>

        {/* Navigation Links */}
        <div className="hidden sm:flex items-center space-x-6">
          <Link
            to="/"
            className="text-base hover:underline underline-offset-4 transition duration-200"
          >
            About
          </Link>
          <Link
            to="/"
            className="text-base hover:underline underline-offset-4 transition duration-200"
          >
            My Games
          </Link>
          <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
            <span className="text-sm font-medium text-gray-700">LS</span>
          </div>
        </div>

        {/* Mobile Menu Icon */}
        <div className="sm:hidden">
          <ContextMenu onLogout={handleLogout} />
        </div>
      </div>
    </header>
  );
};

export default Header;
