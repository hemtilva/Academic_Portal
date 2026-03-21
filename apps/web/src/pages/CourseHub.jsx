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
  const [deleteCourseCandidate, setDeleteCourseCandidate] = useState(null);
  const [deletingCourse, setDeletingCourse] = useState(false);
  const [removeMemberCandidate, setRemoveMemberCandidate] = useState(null);
  const [removingMember, setRemovingMember] = useState(false);
  const [unenrollCandidate, setUnenrollCandidate] = useState(null);
  const [unenrolling, setUnenrolling] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

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

  function askLogout() {
    setShowLogoutConfirm(true);
  }

  function cancelLogout() {
    setShowLogoutConfirm(false);
  }

  function confirmLogout() {
    setShowLogoutConfirm(false);
    logout();
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

  function askRemoveMember(courseId, targetUserId, targetEmail) {
    setRemoveMemberCandidate({
      courseId,
      userId: targetUserId,
      email: targetEmail,
    });
  }

  async function confirmRemoveMember() {
    const courseId = removeMemberCandidate?.courseId;
    const targetUserId = removeMemberCandidate?.userId;
    if (!courseId || !targetUserId) return;

    try {
      setRemovingMember(true);
      setMemberStatus("Removing member...");
      await apiFetch(`/courses/${courseId}/members/${targetUserId}`, {
        method: "DELETE",
      });
      const data = await apiFetch(`/courses/${courseId}/members`);
      setMembers(Array.isArray(data?.members) ? data.members : []);
      setMemberStatus("Member removed.");
      setRemoveMemberCandidate(null);
    } catch (e) {
      setMemberStatus(e?.message || "Failed to remove member");
    } finally {
      setRemovingMember(false);
    }
  }

  function cancelRemoveMember() {
    if (removingMember) return;
    setRemoveMemberCandidate(null);
  }

  function askUnenrollFromCourse(course) {
    setUnenrollCandidate(course);
  }

  async function confirmUnenrollFromCourse() {
    const courseId = unenrollCandidate?.courseId;
    if (!courseId) return;

    try {
      setUnenrolling(true);
      setError("");
      await apiFetch(`/courses/${courseId}/enrollment`, { method: "DELETE" });
      if (activeMembersCourseId === courseId) {
        setActiveMembersCourseId(null);
        setMembers([]);
        setMemberStatus("");
      }
      setUnenrollCandidate(null);
      await loadCourses();
    } catch (e) {
      setError(e?.message || "Failed to unenroll from course");
    } finally {
      setUnenrolling(false);
    }
  }

  function cancelUnenrollFromCourse() {
    if (unenrolling) return;
    setUnenrollCandidate(null);
  }

  function askDeleteCourse(course) {
    setDeleteCourseCandidate(course);
  }

  async function confirmDeleteCourse() {
    const courseId = deleteCourseCandidate?.courseId;
    if (!courseId) return;

    try {
      setDeletingCourse(true);
      setError("");
      await apiFetch(`/courses/${courseId}`, { method: "DELETE" });
      if (activeMembersCourseId === courseId) {
        setActiveMembersCourseId(null);
        setMembers([]);
        setMemberStatus("");
      }
      setDeleteCourseCandidate(null);
      await loadCourses();
    } catch (e) {
      setError(e?.message || "Failed to delete course");
    } finally {
      setDeletingCourse(false);
    }
  }

  function cancelDeleteCourse() {
    if (deletingCourse) return;
    setDeleteCourseCandidate(null);
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
          <button type="button" className="ap-button" onClick={askLogout}>
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
                      <>
                        <button
                          type="button"
                          className="ap-courseHub__ghostBtn"
                          onClick={() => openMembers(c.courseId)}
                        >
                          {activeMembersCourseId === c.courseId
                            ? "Hide Members"
                            : "Manage Members"}
                        </button>
                        <button
                          type="button"
                          className="ap-courseHub__ghostBtn ap-courseHub__ghostBtn--danger"
                          onClick={() => askDeleteCourse(c)}
                        >
                          Delete Course
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="ap-courseHub__ghostBtn ap-courseHub__ghostBtn--danger"
                        onClick={() => askUnenrollFromCourse(c)}
                      >
                        Unenroll
                      </button>
                    )}
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
                              <div className="ap-courseHub__memberActions">
                                <span className="ap-courseHub__chip">
                                  {m.role}
                                </span>
                                {m.role !== "professor" ? (
                                  <button
                                    type="button"
                                    className="ap-courseHub__memberRemoveBtn"
                                    onClick={() =>
                                      askRemoveMember(
                                        c.courseId,
                                        m.userId,
                                        m.email,
                                      )
                                    }
                                  >
                                    Remove
                                  </button>
                                ) : null}
                              </div>
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
        aria-label={
          user?.role === "professor" ? "Create course" : "Join course"
        }
      >
        <span className="ap-courseHub__fabIcon" aria-hidden="true">
          +
        </span>
      </button>

      {deleteCourseCandidate ? (
        <div className="sd-modalOverlay" role="dialog" aria-modal="true">
          <div className="sd-modalCard">
            <div className="sd-modalTitle">Confirm Course Deletion</div>
            <div className="sd-modalBody">
              Delete course "{deleteCourseCandidate.name}"?
              <div className="sd-modalSubtle">
                This will permanently remove all members, doubts, and messages
                in this course.
              </div>
            </div>
            <div className="sd-modalActions">
              <button
                type="button"
                className="sd-modalBtn is-primary"
                onClick={confirmDeleteCourse}
                disabled={deletingCourse}
              >
                {deletingCourse ? "Deleting..." : "Yes, Delete"}
              </button>
              <button
                type="button"
                className="sd-modalBtn is-accent"
                onClick={cancelDeleteCourse}
                disabled={deletingCourse}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {removeMemberCandidate ? (
        <div className="sd-modalOverlay" role="dialog" aria-modal="true">
          <div className="sd-modalCard">
            <div className="sd-modalTitle">Confirm Member Removal</div>
            <div className="sd-modalBody">
              Remove "{removeMemberCandidate.email}" from this course?
              <div className="sd-modalSubtle">
                If this is a TA, assigned doubts will be reassigned. If this is
                a student, their doubts for this course will be deleted.
              </div>
            </div>
            <div className="sd-modalActions">
              <button
                type="button"
                className="sd-modalBtn is-primary"
                onClick={confirmRemoveMember}
                disabled={removingMember}
              >
                {removingMember ? "Removing..." : "Yes, Remove"}
              </button>
              <button
                type="button"
                className="sd-modalBtn is-accent"
                onClick={cancelRemoveMember}
                disabled={removingMember}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {unenrollCandidate ? (
        <div className="sd-modalOverlay" role="dialog" aria-modal="true">
          <div className="sd-modalCard">
            <div className="sd-modalTitle">Confirm Unenroll</div>
            <div className="sd-modalBody">
              Unenroll from "{unenrollCandidate.name}"?
              <div className="sd-modalSubtle">
                This may reassign or remove your doubts depending on your role.
              </div>
            </div>
            <div className="sd-modalActions">
              <button
                type="button"
                className="sd-modalBtn is-primary"
                onClick={confirmUnenrollFromCourse}
                disabled={unenrolling}
              >
                {unenrolling ? "Unenrolling..." : "Yes, Unenroll"}
              </button>
              <button
                type="button"
                className="sd-modalBtn is-accent"
                onClick={cancelUnenrollFromCourse}
                disabled={unenrolling}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showLogoutConfirm ? (
        <div className="sd-modalOverlay" role="dialog" aria-modal="true">
          <div className="sd-modalCard">
            <div className="sd-modalTitle">Confirm Logout</div>
            <div className="sd-modalBody">Are you sure you want to logout?</div>
            <div className="sd-modalActions">
              <button
                type="button"
                className="sd-modalBtn is-primary"
                onClick={confirmLogout}
              >
                Yes, Logout
              </button>
              <button
                type="button"
                className="sd-modalBtn is-accent"
                onClick={cancelLogout}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
