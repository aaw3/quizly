import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import JoinGame from "./pages/JoinGame";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/joingame" element={<JoinGame />} />
      </Routes>
    </Router>
  );
}
