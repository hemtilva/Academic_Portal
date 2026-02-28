import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useLocation,
} from "react-router-dom";

import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import StudentDoubts from "./pages/StudentDoubts.jsx";
import ChatDoubt from "./pages/ChatDoubt.jsx";
import ChatDemo from "./pages/ChatDemo.jsx";

function TopNav() {
  const location = useLocation();

  const hideNav =
    location.pathname === "/login" ||
    location.pathname === "/signup" ||
    location.pathname.startsWith("/doubts");

  if (hideNav) return null;

  return (
    <div
      style={{
        padding: 12,
        borderBottom: "1px solid #eee",
        display: "flex",
        gap: 12,
      }}
    >
      <Link to="/">Home</Link>
      <Link to="/doubts">Doubts</Link>
      <Link to="/chat-demo">Chat Demo</Link>
      <Link to="/login">Login</Link>
      <Link to="/signup">Signup</Link>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <TopNav />

      <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/doubts" element={<StudentDoubts />} />
          <Route path="/doubts/:id" element={<ChatDoubt />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/chat-demo" element={<ChatDemo />} />
      </Routes>
    </BrowserRouter>
  );
}