import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";
import "./CourseHub.css";

function coursePath(course) {
  if (course?.role === "professor") {
    return `/course/${course.courseId}/instructor`;
  }
  return `/course/${course.courseId}/doubts`;
}

export default function CourseHub() {
  const nav = useNavigate();
  const [user, setUser] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [activeMembersCourseId, setActiveMembersCourseId] = useState(null);
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState("student");
  const [memberStatus, setMemberStatus] = useState("");

  async function loadCourses() {
    try {
      setLoading(true);
      setError("");
      const data = await apiFetch("/courses/user");
      setCourses(Array.isArray(data?.courses) ? data.courses : []);
    } catch (e) {
      const msg = e?.message || "Failed to load courses";
      setError(msg);
      if (String(msg).toLowerCase().includes("unauthorized")) {
        nav("/login", { replace: true });
      }
    } finally {
      setLoading(false);
    }
  }

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

    loadCourses();
  }, [nav]);

  function logout() {
    localStorage.removeItem("ap_token");
    localStorage.removeItem("ap_user");
    nav("/login", { replace: true });
  }

  async function openMembers(courseId) {
    if (activeMembersCourseId === courseId) {
      setActiveMembersCourseId(null);
      setMembers([]);
      setMemberStatus("");
      return;
    }

    try {
      setMembersLoading(true);
      setMemberStatus("");
      setActiveMembersCourseId(courseId);
      const data = await apiFetch(`/courses/${courseId}/members`);
      setMembers(Array.isArray(data?.members) ? data.members : []);
    } catch (e) {
      setMemberStatus(e?.message || "Failed to load members");
    } finally {
      setMembersLoading(false);
    }
  }

  async function addMember(courseId, e) {
    e.preventDefault();
    if (!memberEmail.trim()) return;

    try {
      setMemberStatus("Adding member...");
      await apiFetch(`/courses/${courseId}/members`, {
        method: "POST",
        body: { email: memberEmail.trim(), role: memberRole },
      });
      setMemberEmail("");
      const data = await apiFetch(`/courses/${courseId}/members`);
      setMembers(Array.isArray(data?.members) ? data.members : []);
      setMemberStatus("Member added.");
    } catch (e) {
      setMemberStatus(e?.message || "Failed to add member");
    }
  }

  return (
    <div className="ap-courseHubScreen">
      <div className="ap-card ap-courseHub">
        <div className="ap-courseHub__top">
          <div>
            <h2 className="ap-title" style={{ marginBottom: 4 }}>
              Course Dashboard
            </h2>
            <div className="ap-subtle">
              {user?.email || "User"} · {user?.role || "role"}
            </div>
          </div>
          <button type="button" className="ap-button" onClick={logout}>
            Logout
          </button>
        </div>

        <div className="ap-courseHub__panel">
          <div className="ap-courseHub__panelTitle">My Courses</div>

          {loading ? (
            <div className="ap-dashboard-empty">Loading courses...</div>
          ) : courses.length === 0 ? (
            <div className="ap-dashboard-empty">
              No courses yet.{" "}
              {user?.role === "professor"
                ? "Create your first one."
                : "Ask your professor for a join code."}
            </div>
          ) : (
            <div className="ap-courseHub__grid">
              {courses.map((c) => (
                <div key={c.courseId} className="ap-courseHub__courseCard">
                  <div className="ap-courseHub__courseHead">
                    <div className="ap-courseHub__courseName">{c.name}</div>
                    <div className="ap-courseHub__chip">{c.role}</div>
                  </div>

                  <div className="ap-courseHub__courseMeta">
                    <span>Prof: {c.professorEmail || "-"}</span>
                    {c.role === "professor" ? (
                      <span>Code: {c.joinCode}</span>
                    ) : null}
                  </div>

                  {c.description ? (
                    <div className="ap-courseHub__description">
                      {c.description}
                    </div>
                  ) : null}

                  <div className="ap-courseHub__actions">
                    <button
                      type="button"
                      className="ap-button"
                      onClick={() => nav(coursePath(c))}
                    >
                      Open Course
                    </button>

                    {c.role === "professor" ? (
                      <button
                        type="button"
                        className="ap-courseHub__ghostBtn"
                        onClick={() => openMembers(c.courseId)}
                      >
                        {activeMembersCourseId === c.courseId
                          ? "Hide Members"
                          : "Manage Members"}
                      </button>
                    ) : null}
                  </div>

                  {c.role === "professor" &&
                  activeMembersCourseId === c.courseId ? (
                    <div className="ap-courseHub__membersWrap">
                      <form
                        className="ap-courseHub__membersForm"
                        onSubmit={(e) => addMember(c.courseId, e)}
                      >
                        <input
                          className="ap-input"
                          value={memberEmail}
                          onChange={(e) => setMemberEmail(e.target.value)}
                          placeholder="student/ta email"
                        />
                        <select
                          className="ap-input"
                          value={memberRole}
                          onChange={(e) => setMemberRole(e.target.value)}
                        >
                          <option value="student">student</option>
                          <option value="ta">ta</option>
                        </select>
                        <button type="submit" className="ap-button">
                          Add Member
                        </button>
                      </form>

                      {membersLoading ? (
                        <div className="ap-dashboard-empty">
                          Loading members...
                        </div>
                      ) : (
                        <div className="ap-courseHub__membersList">
                          {members.map((m) => (
                            <div
                              key={`${m.userId}-${m.role}`}
                              className="ap-courseHub__memberRow"
                            >
                              <span>{m.email}</span>
                              <span className="ap-courseHub__chip">
                                {m.role}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {memberStatus ? (
                        <div className="ap-status">{memberStatus}</div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>

        {error ? <div className="ap-status is-error">{error}</div> : null}
      </div>

      <button
        type="button"
        className="ap-button ap-courseHub__fab"
        onClick={() => nav("/courses/access")}
        aria-label={user?.role === "professor" ? "Create course" : "Join course"}
      >
        <span className="ap-courseHub__fabIcon" aria-hidden="true">
          +
        </span>
      </button>
    </div>
  );
}
