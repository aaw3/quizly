import React, { useState, useRef, useEffect } from "react";

interface ContextMenuProps {
  onLogout: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const toggleMenu = () => setIsOpen((prev) => !prev);

  // Close the menu if clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="relative inline-block z-10" ref={menuRef}>
      {/* Icon */}
      <div
        className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center cursor-pointer hover:shadow-lg"
        onClick={toggleMenu}
      >
        <span className="text-gray-800">LS</span>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg">
          <ul className="py-2">
            <li className="px-4 py-2 text-gray-700 hover:bg-gray-100 cursor-pointer">
              Profile
            </li>
            <li className="px-4 py-2 text-gray-700 hover:bg-gray-100 cursor-pointer">
              Settings
            </li>
            <li
              className="px-4 py-2 text-red-500 hover:bg-red-100 cursor-pointer"
              onClick={onLogout}
            >
              Logout
            </li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default ContextMenu;
