import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./stylesheets/App.css";

import Login from "./pages/auth/Login.jsx";
import Signup from "./pages/auth/Signup.jsx";

import CourseHub from "./pages/courseHub/CourseHub.jsx";
import CourseAccess from "./pages/courseHub/CourseAccess.jsx";

import DoubtsLayout from "./pages/student/DoubtsLayout.jsx";
import StudentDoubts from "./pages/student/StudentDoubts.jsx";

import ChatDoubt from "./pages/ChatDoubt.jsx";

import InstructorLayout from "./pages/instructor/InstructorLayout.jsx";
import InstructorDashboard from "./pages/instructor/InstructorDashboard.jsx";

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
          <Route index element={<InstructorDashboard />} />
          <Route path=":id" element={<ChatDoubt />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
