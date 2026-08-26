import { useCallback, useEffect, useState } from "react";
import Landing from "./Landing";
import Orrery from "./Orrery";
import PracticeMode from "./PracticeMode";
import TimedTest from "./TimedTest";
import BrowsePanel from "./BrowsePanel";
import Starfield from "./Starfield";
import { filterQuestions, searchQuestions, subjectLabel } from "./quizUtils";
import { useScreenFade } from "./useScreenFade";
import "./App.css";

const EMPTY_FILTER = { subject: "all", domain: null, skill: null, searchQuery: null };

// Two routes, addressed by hash so a deep link (and the back button) work
// without pulling in a router: the landing page at "#/" and the app at
// "#/app". The entry intent a landing CTA carries is kept in state rather
// than the URL — it only describes how to open the app that one time.
function readRoute() {
  return window.location.hash.startsWith("#/app") ? "app" : "landing";
}

// A landing CTA hands over an intent describing which screen the user asked
// for, so a stage in the orrery can open filtered practice or the timed test
// directly instead of dropping everyone on the same screen.
function resolveEntry(entry) {
  if (entry && entry.type === "timed") {
    return { screen: "timed", filter: EMPTY_FILTER, browse: false };
  }
  if (entry && entry.type === "browse") {
    return { screen: "orrery", filter: EMPTY_FILTER, browse: true };
  }
  if (entry && entry.type === "domain") {
    return {
      screen: "practice",
      filter: { subject: entry.subject, domain: entry.domain, skill: null, searchQuery: null },
      browse: false,
    };
  }
  return { screen: "orrery", filter: EMPTY_FILTER, browse: false };
}

// Everything behind "#/app": the orrery is the hub, and practice and the
// timed test are the two things it launches.
function AppShell({ entry, onExit }) {
  const triggerFade = useScreenFade();
  const [initial] = useState(() => resolveEntry(entry));
  const [screen, setScreen] = useState(initial.screen); // orrery | practice | timed
  const [filter, setFilter] = useState(initial.filter);
  const [browseOpen, setBrowseOpen] = useState(initial.browse);

  function startPractice(nextFilter) {
    const variant = screen === "practice" ? "light" : "full";
    triggerFade(variant, () => {
      setFilter({ ...nextFilter, searchQuery: null });
      setScreen("practice");
    });
  }

  function startSearch(query) {
    const variant = screen === "practice" ? "light" : "full";
    triggerFade(variant, () => {
      setFilter({ subject: null, domain: null, skill: null, searchQuery: query });
      setScreen("practice");
    });
  }

  function startFromStage(stageEntry) {
    if (stageEntry.type === "timed") {
      triggerFade("full", () => setScreen("timed"));
      return;
    }
    startPractice({ subject: stageEntry.subject, domain: stageEntry.domain, skill: null });
  }

  function returnToOrrery() {
    triggerFade("full", () => setScreen("orrery"));
  }

  function handleBrowseFilter(nextFilter) {
    setBrowseOpen(false);
    startPractice(nextFilter);
  }

  function handleBrowseSearch(query) {
    setBrowseOpen(false);
    startSearch(query);
  }

  const pool = filter.searchQuery ? searchQuestions(filter.searchQuery) : filterQuestions(filter);

  let title = "All Questions";
  let subtitle = "Randomized practice across Reading & Writing and Math";
  if (filter.searchQuery) {
    title = "Search Results";
    subtitle = `"${filter.searchQuery}" · ${pool.length} question${pool.length === 1 ? "" : "s"}`;
  } else if (filter.skill) {
    title = filter.skill;
    subtitle = `${subjectLabel(filter.subject)} · ${filter.domain}`;
  } else if (filter.domain) {
    title = filter.domain;
    subtitle = `${subjectLabel(filter.subject)} · Randomized ${filter.domain} practice`;
  } else if (filter.subject && filter.subject !== "all") {
    title = subjectLabel(filter.subject);
    subtitle = `Randomized ${subjectLabel(filter.subject)} practice`;
  }

  const filterKey = `${filter.subject}|${filter.domain}|${filter.skill}|${filter.searchQuery}`;

  return (
    <div className="app-shell" lang="en">
      <Starfield />

      {screen === "orrery" ? (
        <Orrery
          onClose={onExit}
          onEnter={startFromStage}
          onBrowse={() => setBrowseOpen(true)}
        />
      ) : (
        <>
          <button
            type="button"
            className="orrery-hud-btn"
            onClick={() => setBrowseOpen((o) => !o)}
            aria-label="Browse and search all questions"
          >
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path
                d="M13.5 13.5 18 18M15.5 9a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            Browse
          </button>

          <nav className="orrery-topnav" aria-label="App navigation">
            <button type="button" className="orrery-nav-link" onClick={returnToOrrery}>
              &larr; Return to Orrery
            </button>
          </nav>

          <div className="orrery-content">
            {screen === "practice" && (
              <PracticeMode key={filterKey} questionPool={pool} title={title} subtitle={subtitle} />
            )}
            {screen === "timed" && <TimedTest />}
          </div>
        </>
      )}

      {browseOpen && (
        <BrowsePanel
          onClose={() => setBrowseOpen(false)}
          onStartFilter={handleBrowseFilter}
          onStartSearch={handleBrowseSearch}
        />
      )}
    </div>
  );
}

function App() {
  const [route, setRoute] = useState(readRoute);
  const [entry, setEntry] = useState(null);

  useEffect(() => {
    document.title = "SAT Practice";
  }, []);

  useEffect(() => {
    function onHashChange() {
      const next = readRoute();
      if (next === "landing") setEntry(null);
      setRoute(next);
    }
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const enterApp = useCallback((nextEntry) => {
    setEntry(nextEntry ?? null);
    window.location.hash = "#/app";
  }, []);

  const exitToLanding = useCallback(() => {
    window.location.hash = "#/";
  }, []);

  if (route === "landing") return <Landing onEnter={enterApp} />;

  // Remounting on each entry keeps the shell's screen/filter state honest:
  // a fresh intent should not have to reconcile with a stale one.
  return <AppShell key={route} entry={entry} onExit={exitToLanding} />;
}

export default App;
