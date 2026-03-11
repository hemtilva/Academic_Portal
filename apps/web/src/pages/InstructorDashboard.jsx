import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import "./InstructorDashboard.css";

export default function InstructorDashboard() {
  const [tas, setTAs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchTAs() {
      try {
        setLoading(true);
        setError("");
        // Fetch all TAs and their assigned doubts count
        const data = await apiFetch("/instructor/tas");
        setTAs(Array.isArray(data.tas) ? data.tas : []);
      } catch (e) {
        setError(e.message || "Failed to load TAs");
      } finally {
        setLoading(false);
      }
    }
    fetchTAs();
  }, []);

  return (
    <div className="instructor-dashboard">
      <h2>Instructor Dashboard</h2>
      {error && <div className="error">{error}</div>}
      {loading ? (
        <div>Loading...</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>TA Name</th>
              <th>Email</th>
              <th>Assigned Doubts</th>
              <th>Cleared Doubts</th>
            </tr>
          </thead>
          <tbody>
            {tas.map((ta) => (
              <tr key={ta.user_id}>
                <td>{ta.name || ta.email}</td>
                <td>{ta.email}</td>
                <td>{ta.doubt_count}</td>
                <td>{ta.cleared_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
