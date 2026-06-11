import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../../lib/api";
import ConfirmDialog from "../../lib/ConfirmDialog";

import "../../stylesheets/CourseHub.css";

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

      <ConfirmDialog
        isOpen={deleteCourseCandidate != null}
        title="Confirm Course Deletion"
        onConfirm={confirmDeleteCourse}
        onCancel={cancelDeleteCourse}
        confirmDisabled={deletingCourse}
      >
        Delete course {deleteCourseCandidate?.name ?? null}?
        <div className="sd-modalSubtle">
          This will permanently remove all members, doubts, and messages in this
          course.
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        isOpen={removeMemberCandidate != null}
        title="Confirm Member Removal"
        onConfirm={confirmRemoveMember}
        onCancel={cancelRemoveMember}
        confirmDisabled={removingMember}
      >
        Remove {removeMemberCandidate?.email ?? null} from this course?
        <div className="sd-modalSubtle">
          If this is a TA, assigned doubts will be reassigned. If this is a
          student, their doubts for this course will be deleted.
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        isOpen={unenrollCandidate != null}
        title="Confirm Unenroll"
        onConfirm={confirmUnenrollFromCourse}
        onCancel={cancelUnenrollFromCourse}
        confirmDisabled={unenrolling}
      >
        Unenroll from {unenrollCandidate?.name ?? null}?
        <div className="sd-modalSubtle">
          This may reassign or remove your doubts depending on your role.
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        isOpen={showLogoutConfirm}
        title="Confirm Logout"
        onConfirm={confirmLogout}
        onCancel={cancelLogout}
      >
        Are you sure you want to logout?
      </ConfirmDialog>
    </div>
  );
}
