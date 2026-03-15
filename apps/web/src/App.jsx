import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import StudentDoubts from "./pages/StudentDoubts.jsx";
import ChatDoubt from "./pages/ChatDoubt.jsx";
import DoubtsLayout from "./pages/DoubtsLayout.jsx";

import InstructorLayout from "./pages/InstructorLayout.jsx";
import InstructorDashboardBlank from "./pages/InstructorDashboardBlank.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/doubts" replace />} />
        <Route path="/doubts" element={<DoubtsLayout />}>
          <Route index element={<StudentDoubts />} />
          <Route path=":id" element={<ChatDoubt />} />
        </Route>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/instructor" element={<InstructorLayout />}>
          <Route index element={<InstructorDashboardBlank />} />
          <Route path=":id" element={<ChatDoubt />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
