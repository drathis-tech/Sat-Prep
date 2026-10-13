import { useCallback, useEffect, useState } from "react";
import Landing from "./Landing";
import Orrery from "./Orrery";
import PracticeMode from "./PracticeMode";
import TimedTest from "./TimedTest";
import BrowsePanel from "./BrowsePanel";
import Starfield from "./Starfield";
import Login from "./Login";
import MissionControl from "./MissionControl";
import { loadSession, useStudent } from "./student";
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
  const [missionOpen, setMissionOpen] = useState(false);

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

  // Names the set on the results screen.
  let title = "All Questions";
  if (filter.searchQuery) title = `Search: ${filter.searchQuery}`;
  else if (filter.skill) title = filter.skill;
  else if (filter.domain) title = filter.domain;
  else if (filter.subject && filter.subject !== "all") title = subjectLabel(filter.subject);

  const filterKey = `${filter.subject}|${filter.domain}|${filter.skill}|${filter.searchQuery}`;

  return (
    <div className="app-shell" lang="en">
      <Starfield />

      {screen === "orrery" ? (
        <Orrery
          onClose={onExit}
          onEnter={startFromStage}
          onBrowse={() => setBrowseOpen(true)}
          onMission={() => setMissionOpen(true)}
          paused={browseOpen || missionOpen}
        />
      ) : screen === "practice" ? (
        <PracticeMode
          key={filterKey}
          questionPool={pool}
          title={title}
          onExit={returnToOrrery}
        />
      ) : (
        <TimedTest onExit={returnToOrrery} />
      )}

      {browseOpen && (
        <BrowsePanel
          onClose={() => setBrowseOpen(false)}
          onStartFilter={handleBrowseFilter}
          onStartSearch={handleBrowseSearch}
        />
      )}

      {missionOpen && <MissionControl onClose={() => setMissionOpen(false)} />}
    </div>
  );
}

function App() {
  const [route, setRoute] = useState(readRoute);
  const [entry, setEntry] = useState(null);
  const { status } = useStudent();

  useEffect(() => {
    document.title = "SAT Practice";
    loadSession();
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

  // The landing page is public; everything behind "#/app" belongs to a
  // signed-in student, since every answer there is scored.
  if (status === "loading") {
    return (
      <div className="cm-screen">
        <p className="cm-loading">Contacting Mission Control…</p>
      </div>
    );
  }
  if (status !== "signedIn") return <Login onBack={exitToLanding} />;

  // Remounting on each entry keeps the shell's screen/filter state honest:
  // a fresh intent should not have to reconcile with a stale one.
  return <AppShell key={route} entry={entry} onExit={exitToLanding} />;
}

export default App;
