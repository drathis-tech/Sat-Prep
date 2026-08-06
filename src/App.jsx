import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import Landing from "./Landing";
import PracticeMode from "./PracticeMode";
import TimedTest from "./TimedTest";
import { filterQuestions, subjectLabel } from "./quizUtils";
import "./App.css";

const SIDEBAR_COLLAPSED_KEY = "sat-practice-sidebar-collapsed";
const THEME_KEY = "sat-practice-theme";

function readStoredCollapsed() {
  try {
    const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    // No preference saved yet — default to collapsed so the question area
    // is full-width on first load.
    return stored === null ? true : stored === "1";
  } catch {
    return true;
  }
}

function readInitialTheme() {
  // A blocking inline script in index.html already resolved localStorage /
  // prefers-color-scheme and set this attribute before React ever mounts —
  // read it back here so state matches what's already painted (no flash).
  const attr = document.documentElement.getAttribute("data-theme");
  return attr === "light" ? "light" : "dark";
}

function App() {
  const [view, setView] = useState("landing"); // landing | practice | timed
  const [filter, setFilter] = useState({ subject: "all", domain: null, skill: null });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(readStoredCollapsed);
  const [theme, setTheme] = useState(readInitialTheme);

  useEffect(() => {
    document.title = "SAT Practice";
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, sidebarCollapsed ? "1" : "0");
    } catch {
      // localStorage unavailable (e.g. private browsing) — collapse state just won't persist.
    }
  }, [sidebarCollapsed]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // localStorage unavailable (e.g. private browsing) — theme choice just won't persist.
    }
  }, [theme]);

  function toggleTheme() {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }

  function startPractice(nextFilter) {
    setFilter(nextFilter);
    setView("practice");
  }

  function startTimed() {
    setView("timed");
  }

  let activeKey = null;
  if (view === "timed") {
    activeKey = "timed";
  } else if (view === "practice") {
    if (filter.skill) activeKey = `skill:${filter.domain}::${filter.skill}`;
    else if (filter.subject === "reading_writing") activeKey = "rw";
    else if (filter.subject === "math") activeKey = "math";
    else activeKey = "all";
  }

  let title = "All Questions";
  let subtitle = "Randomized practice across Reading & Writing and Math";
  if (view === "practice") {
    if (filter.skill) {
      title = filter.skill;
      subtitle = `${subjectLabel(filter.subject)} · ${filter.domain}`;
    } else if (filter.subject !== "all") {
      title = subjectLabel(filter.subject);
      subtitle = `Randomized ${subjectLabel(filter.subject)} practice`;
    }
  }

  const filterKey = `${filter.subject}|${filter.domain}|${filter.skill}`;

  return (
    <div className="app-shell">
      <button
        type="button"
        className="theme-toggle"
        onClick={toggleTheme}
        aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      >
        {theme === "dark" ? (
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <circle cx="10" cy="10" r="4" fill="none" stroke="currentColor" strokeWidth="1.6" />
            <path
              d="M10 1.5v2M10 16.5v2M18.5 10h-2M3.5 10h-2M15.7 4.3l-1.4 1.4M5.7 14.3l-1.4 1.4M15.7 15.7l-1.4-1.4M5.7 5.7 4.3 4.3"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        ) : (
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path
              d="M17 12.4A7.5 7.5 0 0 1 7.6 3a7.5 7.5 0 1 0 9.4 9.4Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>

      <button
        type="button"
        className="sidebar-toggle"
        onClick={() => setSidebarCollapsed((c) => !c)}
        aria-label={sidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
        aria-expanded={!sidebarCollapsed}
      >
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <path
            d="M3 5.5h14M3 10h14M3 14.5h14"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </button>

      <div className={`main-area${sidebarCollapsed ? " main-area-full" : ""}`}>
        {view === "landing" && (
          <Landing
            onStartPractice={() =>
              startPractice({ subject: "all", domain: null, skill: null })
            }
            onStartTimed={startTimed}
          />
        )}
        {view === "practice" && (
          <PracticeMode
            key={filterKey}
            questionPool={filterQuestions(filter)}
            title={title}
            subtitle={subtitle}
          />
        )}
        {view === "timed" && <TimedTest />}
      </div>

      {!sidebarCollapsed && (
        <Sidebar
          activeKey={activeKey}
          onSelectAll={() => startPractice({ subject: "all", domain: null, skill: null })}
          onSelectTimed={startTimed}
          onSelectSubject={(subject) => startPractice({ subject, domain: null, skill: null })}
          onSelectSkill={(subject, domain, skill) => startPractice({ subject, domain, skill })}
        />
      )}
    </div>
  );
}

export default App;
