import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./App.css";

import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import CourseHub from "./pages/CourseHub.jsx";
import CourseAccess from "./pages/CourseAccess.jsx";
import StudentDoubts from "./pages/StudentDoubts.jsx";
import ChatDoubt from "./pages/ChatDoubt.jsx";
import DoubtsLayout from "./pages/DoubtsLayout.jsx";

import InstructorLayout from "./pages/InstructorLayout.jsx";
import InstructorDashboardBlank from "./pages/InstructorDashboardBlank.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/courses" replace />} />
        <Route path="/courses" element={<CourseHub />} />
        <Route path="/courses/access" element={<CourseAccess />} />
        <Route path="/course/:courseId/doubts" element={<DoubtsLayout />}>
          <Route index element={<StudentDoubts />} />
          <Route path=":id" element={<ChatDoubt />} />
        </Route>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/doubts/*" element={<Navigate to="/courses" replace />} />
        <Route
          path="/instructor/*"
          element={<Navigate to="/courses" replace />}
        />
        <Route
          path="/course/:courseId/instructor"
          element={<InstructorLayout />}
        >
          <Route index element={<InstructorDashboardBlank />} />
          <Route path=":id" element={<ChatDoubt />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
