import { useState } from "react";
import { login } from "./student";
import "./Practice.css";
import "./Competition.css";

function Login({ onBack }) {
  const [mode, setMode] = useState("login"); // login | create
  const [nickname, setNickname] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const ready = nickname.trim().length >= 2 && /^\d{4}$/.test(pin);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!ready || busy) return;
    setBusy(true);
    setError(null);
    try {
      await login({ nickname, pin, create: mode === "create" });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  function switchMode(next) {
    setMode(next);
    setError(null);
  }

  return (
    <div className="cm-screen">
      <div className="pr-head">
        <div className="pr-crumbs">
          <span className="pr-crumb-app">Vega / Sign in</span>
        </div>
        <div className="pr-head-right">
          <button type="button" className="pr-pill" onClick={onBack}>
            Back
          </button>
        </div>
      </div>

      <div className="cm-login-pane">
        <form className="cm-login" onSubmit={handleSubmit}>
          <h1 className="cm-login-title">{mode === "create" ? "Join the crew" : "Welcome back"}</h1>
          <p className="cm-login-lede">
            {mode === "create"
              ? "Pick a nickname your class will see in Mission Control, and a 4-digit PIN you'll remember."
              : "Enter your nickname and PIN to pick up where you left off."}
          </p>

          <div className="cm-tabs" role="tablist" aria-label="Sign-in type">
            <button
              type="button"
              role="tab"
              className="cm-tab"
              aria-selected={mode === "login"}
              onClick={() => switchMode("login")}
            >
              Log in
            </button>
            <button
              type="button"
              role="tab"
              className="cm-tab"
              aria-selected={mode === "create"}
              onClick={() => switchMode("create")}
            >
              New student
            </button>
          </div>

          <label className="cm-field">
            <span className="pr-label">Nickname</span>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={16}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              autoFocus
            />
          </label>

          <label className="cm-field">
            <span className="pr-label">4-digit PIN</span>
            <input
              type="password"
              className="cm-pin"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              inputMode="numeric"
              autoComplete={mode === "create" ? "new-password" : "current-password"}
            />
          </label>

          {mode === "create" && (
            <p className="cm-hint">
              Don&apos;t use your real name or a PIN you use anywhere else. If you forget your
              PIN, ask your teacher.
            </p>
          )}

          {error && (
            <p className="cm-error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="pr-btn-primary cm-submit" disabled={!ready || busy}>
            {busy ? "Checking…" : mode === "create" ? "Create my account" : "Log in"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
