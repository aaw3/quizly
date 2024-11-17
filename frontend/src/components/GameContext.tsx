import React, { createContext, useContext, useState } from "react";

interface GameContextType {
  gameCode: string | null;
  playerName: string | null;
  isGameActive: boolean;
  setGameCode: (code: string | null) => void;
  setPlayerName: (name: string | null) => void;
  setIsGameActive: (active: boolean) => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [gameCode, setGameCode] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState<string | null>(null);
  const [isGameActive, setIsGameActive] = useState(false);

  return (
    <GameContext.Provider
      value={{ gameCode, playerName, isGameActive, setGameCode, setPlayerName, setIsGameActive }}
    >
      {children}
    </GameContext.Provider>
  );
};

export const useGameContext = (): GameContextType => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error("useGameContext must be used within a GameProvider");
  }
  return context;
};
