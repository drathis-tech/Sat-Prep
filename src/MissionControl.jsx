import { useEffect, useState } from "react";
import { fetchLeaderboard, logout, useStudent } from "./student";
import "./Practice.css";
import "./Competition.css";

const REFRESH_MS = 15000;

function MissionControl({ onClose }) {
  const { student, totals, isOwner } = useStudent();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  // Reloads when the panel opens, on a timer while it stays open, and
  // whenever the current student's own totals change.
  useEffect(() => {
    let cancelled = false;
    function load() {
      fetchLeaderboard()
        .then((next) => {
          if (cancelled) return;
          setData(next);
          setError(null);
        })
        .catch((err) => {
          if (!cancelled) setError(err.message);
        });
    }
    load();
    const interval = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [totals.answered]);

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function handleLogout() {
    if (window.confirm("Log out? Your score is saved to your account.")) logout();
  }

  return (
    <div className="cm-overlay" onClick={onClose}>
      <div
        className="cm-mission"
        role="dialog"
        aria-modal="true"
        aria-label="Mission Control leaderboard"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="cm-mission-head">
          <div>
            <span className="pr-label">Vega / Leaderboard</span>
            <h2 className="cm-mission-title">Mission Control</h2>
          </div>
          <button type="button" className="pr-pill" onClick={onClose}>
            Close
          </button>
        </div>
        <p className="cm-mission-sub">
          Score = 1000 &times; accuracy &times; questions &divide; (questions + 50). Below 60%
          accuracy the score is 0.
        </p>

        <div className="cm-mission-scroll">
          {error && !data ? (
            <p className="cm-mission-empty">{error}</p>
          ) : !data ? (
            <p className="cm-mission-empty">Contacting Mission Control…</p>
          ) : (
            <table className="cm-table">
              <thead>
                <tr>
                  <th scope="col">Rank</th>
                  <th scope="col">Nickname</th>
                  <th scope="col" className="num">Score</th>
                  <th scope="col" className="num">Accuracy</th>
                  <th scope="col" className="num">Answered</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row) => (
                  <tr key={row.rank} data-you={row.isYou ? "" : undefined} aria-current={row.isYou || undefined}>
                    <td className="cm-rank">{String(row.rank).padStart(2, "0")}</td>
                    <td className="cm-name">
                      {row.nickname}
                      {row.isYou && <span className="cm-you">You</span>}
                    </td>
                    <td className="num cm-table-score">{row.score}</td>
                    <td className="num">{row.answered > 0 ? `${Math.round(row.accuracy * 100)}%` : "—"}</td>
                    <td className="num">{row.answered}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="cm-mission-foot">
          <span>Signed in as {student.nickname}</span>
          <span className="cm-mission-foot-actions">
            {isOwner && (
              <a className="pr-pill" href="#/teacher">
                Teacher tools
              </a>
            )}
            <button type="button" className="pr-pill" onClick={handleLogout}>
              Log out
            </button>
          </span>
        </div>
      </div>
    </div>
  );
}

export default MissionControl;
