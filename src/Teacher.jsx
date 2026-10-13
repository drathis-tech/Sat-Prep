import { useEffect, useState } from "react";
import "./Practice.css";
import "./Competition.css";

async function teacherRequest(body) {
  let response;
  try {
    response = await fetch("/api/teacher", {
      method: body ? "POST" : "GET",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      credentials: "same-origin",
    });
  } catch {
    throw new Error("Can't reach the server. Check your connection and try again.");
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Something went wrong. Please try again.");
  return data;
}

function formatDay(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function ClassCode({ value, onSave }) {
  const [code, setCode] = useState(value);
  const [busy, setBusy] = useState(false);
  const changed = code.trim() !== value;

  async function save(next) {
    setBusy(true);
    try {
      await onSave({ action: "classCode", code: next });
      setCode(next.trim());
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="cm-teacher-card">
      <span className="pr-label">Class code</span>
      <p className="cm-hint">
        {value
          ? "New students must type this code to create an account. Existing students are not affected."
          : "No class code set — anyone with the link can create an account."}
      </p>
      <form
        className="cm-teacher-inline"
        onSubmit={(e) => {
          e.preventDefault();
          if (changed && !busy) save(code);
        }}
      >
        <label className="cm-field">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            maxLength={24}
            placeholder="e.g. period-3"
            aria-label="Class code"
            autoComplete="off"
            spellCheck={false}
          />
        </label>
        <button type="submit" className="pr-btn-primary" disabled={!changed || busy}>
          Save
        </button>
        {value && (
          <button type="button" className="pr-btn-ghost" disabled={busy} onClick={() => save("")}>
            Remove code
          </button>
        )}
      </form>
    </section>
  );
}

function StudentRow({ student, onAction }) {
  const [editing, setEditing] = useState(null); // null | "pin" | "rename"
  const [value, setValue] = useState("");

  function open(kind) {
    setEditing(kind);
    setValue(kind === "rename" ? student.nickname : "");
  }

  async function submit(e) {
    e.preventDefault();
    const ok =
      editing === "pin"
        ? await onAction({ action: "resetPin", studentId: student.id, pin: value })
        : await onAction({ action: "rename", studentId: student.id, nickname: value });
    if (ok) setEditing(null);
  }

  function remove() {
    const sure = window.confirm(
      `Remove ${student.nickname}? Their account, answers and score are deleted and can't be restored.`
    );
    if (sure) onAction({ action: "remove", studentId: student.id });
  }

  return (
    <tr>
      <td className="cm-name">
        {student.nickname}
        {student.isYou && <span className="cm-you">You</span>}
      </td>
      <td className="num cm-table-score">{student.score}</td>
      <td className="num">{student.answered > 0 ? `${Math.round(student.accuracy * 100)}%` : "—"}</td>
      <td className="num">{student.answered}</td>
      <td className="num">{formatDay(student.lastActive)}</td>
      <td className="cm-teacher-actions">
        {editing ? (
          <form className="cm-teacher-inline" onSubmit={submit}>
            <label className="cm-field">
              <input
                type="text"
                value={value}
                onChange={(e) =>
                  setValue(editing === "pin" ? e.target.value.replace(/\D/g, "").slice(0, 4) : e.target.value)
                }
                inputMode={editing === "pin" ? "numeric" : undefined}
                maxLength={editing === "pin" ? 4 : 16}
                placeholder={editing === "pin" ? "New PIN" : "New nickname"}
                aria-label={editing === "pin" ? "New 4-digit PIN" : "New nickname"}
                autoComplete="off"
                autoFocus
              />
            </label>
            <button type="submit" className="pr-pill">
              Save
            </button>
            <button type="button" className="pr-pill" onClick={() => setEditing(null)}>
              Cancel
            </button>
          </form>
        ) : (
          <>
            <button type="button" className="pr-pill" onClick={() => open("pin")}>
              Reset PIN
            </button>
            {!student.isYou && (
              <>
                <button type="button" className="pr-pill" onClick={() => open("rename")}>
                  Rename
                </button>
                <button type="button" className="pr-pill cm-pill-danger" onClick={remove}>
                  Remove
                </button>
              </>
            )}
          </>
        )}
      </td>
    </tr>
  );
}

function Teacher({ onBack }) {
  const [state, setState] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    teacherRequest()
      .then((data) => {
        if (!cancelled) setState(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Every action answers with the fresh page state. Resolves to whether it
  // worked, so a row can keep its editor open on a rejected value.
  async function act(body) {
    setError(null);
    try {
      setState(await teacherRequest(body));
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  }

  return (
    <div className="cm-screen">
      <div className="pr-head">
        <div className="pr-crumbs">
          <span className="pr-crumb-app">Vega / Teacher</span>
        </div>
        <div className="pr-head-right">
          <button type="button" className="pr-pill" onClick={onBack}>
            Back
          </button>
        </div>
      </div>

      {!state ? (
        <p className="cm-loading">{error || "Contacting Mission Control…"}</p>
      ) : !state.isOwner ? (
        <p className="cm-loading">These tools aren&apos;t available on this account.</p>
      ) : (
        <div className="cm-teacher">
          <h1 className="cm-login-title">Teacher tools</h1>

          {error && (
            <p className="cm-error" role="alert">
              {error}
            </p>
          )}

          <ClassCode key={state.classCode} value={state.classCode} onSave={act} />

          <section className="cm-teacher-card">
            <span className="pr-label">
              {state.students.length} student{state.students.length === 1 ? "" : "s"}
            </span>
            {state.students.length === 0 ? (
              <p className="cm-hint">No students have signed up yet.</p>
            ) : (
              <div className="cm-teacher-scroll">
                <table className="cm-table">
                  <thead>
                    <tr>
                      <th scope="col">Nickname</th>
                      <th scope="col" className="num">Score</th>
                      <th scope="col" className="num">Accuracy</th>
                      <th scope="col" className="num">Answered</th>
                      <th scope="col" className="num">Last active</th>
                      <th scope="col"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.students.map((s) => (
                      <StudentRow key={s.id} student={s} onAction={act} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

export default Teacher;
