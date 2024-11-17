import React from "react";
import { Navigate } from "react-router-dom";
import { useGameContext } from "./GameContext";

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isGameActive, gameCode } = useGameContext();

  if (!isGameActive || !gameCode) {
    // Redirect to home if no active game
    return <Navigate to="/gamenotfound" replace />;
  }

  // Render the children if the user is in a game
  return <>{children}</>;
};

export default ProtectedRoute;
