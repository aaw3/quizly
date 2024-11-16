import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import JoinGame from "./pages/JoinGame";
import CreateGame from "./pages/CreateGame";
import GamePlay from "./pages/GamePlay";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/joingame" element={<JoinGame />} />
        <Route path="/creategame" element={<CreateGame />} />
        <Route path="/gameplay" element={<GamePlay />} />
      </Routes>
    </Router>
  );
}
