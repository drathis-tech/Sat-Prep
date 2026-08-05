import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import Landing from "./Landing";
import PracticeMode from "./PracticeMode";
import TimedTest from "./TimedTest";
import { filterQuestions, subjectLabel } from "./quizUtils";
import "./App.css";

const SIDEBAR_COLLAPSED_KEY = "sat-practice-sidebar-collapsed";

function readStoredCollapsed() {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

function App() {
  const [view, setView] = useState("landing"); // landing | practice | timed
  const [filter, setFilter] = useState({ subject: "all", domain: null, skill: null });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(readStoredCollapsed);

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

      {!sidebarCollapsed && (
        <Sidebar
          activeKey={activeKey}
          onSelectAll={() => startPractice({ subject: "all", domain: null, skill: null })}
          onSelectTimed={startTimed}
          onSelectSubject={(subject) => startPractice({ subject, domain: null, skill: null })}
          onSelectSkill={(subject, domain, skill) => startPractice({ subject, domain, skill })}
        />
      )}

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
    </div>
  );
}

export default App;
