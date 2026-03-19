import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";
import "./CourseHub.css";

function coursePath(course) {
  if (course?.role === "professor") {
    return `/course/${course.courseId}/instructor`;
  }
  return `/course/${course.courseId}/doubts`;
}

export default function CourseAccess() {
  const nav = useNavigate();
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");

  const [createName, setCreateName] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [creating, setCreating] = useState(false);

  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);

  const canCreate = useMemo(
    () => createName.trim().length > 0 && !creating,
    [createName, creating],
  );

  const canJoin = useMemo(
    () => joinCode.trim().length > 0 && !joining,
    [joinCode, joining],
  );

  useEffect(() => {
    const token = localStorage.getItem("ap_token");
    if (!token) {
      nav("/login", { replace: true });
      return;
    }

    const storedUser = localStorage.getItem("ap_user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        setUser(null);
      }
    }
  }, [nav]);

  async function onCreateCourse(e) {
    e.preventDefault();
    if (!canCreate) return;

    try {
      setCreating(true);
      setError("");
      const data = await apiFetch("/courses", {
        method: "POST",
        body: {
          name: createName.trim(),
          description: createDescription.trim() || null,
        },
      });

      const createdCourseId = data?.course?.courseId;
      if (createdCourseId) {
        nav(`/course/${createdCourseId}/instructor`);
      } else {
        nav("/courses", { replace: true });
      }
    } catch (e) {
      setError(e?.message || "Failed to create course");
    } finally {
      setCreating(false);
    }
  }

  async function onJoinCourse(e) {
    e.preventDefault();
    if (!canJoin) return;

    try {
      setJoining(true);
      setError("");
      const data = await apiFetch("/courses/join", {
        method: "POST",
        body: { joinCode: joinCode.trim().toUpperCase() },
      });

      const joined = data?.course;
      if (joined?.courseId) {
        nav(coursePath(joined));
      } else {
        nav("/courses", { replace: true });
      }
    } catch (e) {
      setError(e?.message || "Failed to join course");
    } finally {
      setJoining(false);
    }
  }

  return (
    <div className="ap-courseHubScreen">
      <div className="ap-page ap-page--centered ap-card ap-courseHub">
        <div className="ap-courseHub__top">
          <div>
            <h2 className="ap-title" style={{ marginBottom: 4 }}>
              {user?.role === "professor" ? "Create Course" : "Join Course"}
            </h2>
            <div className="ap-subtle">
              {user?.email || "User"} · {user?.role || "role"}
            </div>
          </div>
          <button
            type="button"
            className="ap-courseHub__ghostBtn"
            onClick={() => nav("/courses")}
          >
            Back
          </button>
        </div>

        {user?.role === "professor" ? (
          <form className="ap-courseHub__panel" onSubmit={onCreateCourse}>
            <div className="ap-courseHub__panelTitle">Create New Course</div>
            <input
              className="ap-input"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder="Course name (e.g., CS299 AI Lab)"
            />
            <input
              className="ap-input"
              value={createDescription}
              onChange={(e) => setCreateDescription(e.target.value)}
              placeholder="Optional description"
            />
            <button type="submit" className="ap-button" disabled={!canCreate}>
              {creating ? "Creating..." : "Create Course"}
            </button>
          </form>
        ) : (
          <form className="ap-courseHub__panel" onSubmit={onJoinCourse}>
            <div className="ap-courseHub__panelTitle">Join a Course</div>
            <input
              className="ap-input ap-courseHub__codeInput"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="Enter join code"
              maxLength={10}
            />
            <button type="submit" className="ap-button" disabled={!canJoin}>
              {joining ? "Joining..." : "Join Course"}
            </button>
          </form>
        )}

        {error ? <div className="ap-status is-error">{error}</div> : null}
      </div>
    </div>
  );
}
