import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { GameProvider } from "./components/GameContext"; 
import Home from "./pages/Home";
import JoinGame from "./pages/JoinGame";
import CreateGame from "./pages/CreateGame";
import GamePlay from "./pages/GamePlay";
import ProtectedRoute from "./components/ProtectedRoute";
import GameNotFound from "./pages/GameNotFound";
import About from "./pages/About";

export default function App() {
  return (
    <GameProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/joingame" element={<JoinGame />} />
          <Route path="/creategame" element={<CreateGame />} />
          <Route
            path="/gameplay"
            element={
              <ProtectedRoute>
                <GamePlay />
              </ProtectedRoute>
            }
          />
          <Route path="/gamenotfound" element={<GameNotFound />} />
          <Route path="/about" element={<About />} />
        </Routes>
      </Router>
    </GameProvider>
  );
}
