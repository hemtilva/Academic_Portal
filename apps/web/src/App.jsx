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

function TopNav() {
  const location = useLocation();
  const hideNav =
    location.pathname === "/login" || location.pathname === "/signup";
  if (hideNav) return null;

  return (
    <div style={{ padding: 12, borderBottom: "1px solid #eee" }}>
      <Link to="/" style={{ marginRight: 10 }}>
        Home
      </Link>
      <Link to="/login" style={{ marginRight: 10 }}>
        Login
      </Link>
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
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
      </Routes>
    </BrowserRouter>
  );
}
