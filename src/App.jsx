import { useCallback, useEffect, useState } from "react";
import ConceptOrrery from "./ConceptOrrery";
import Landing from "./Landing";
import Starfield from "./Starfield";
import "./App.css";

// Two screens, addressed by hash so a deep link (and the back button) works
// without pulling in a router: the landing page at "#/" and the app at
// "#/app". The entry intent a landing CTA carries is kept in state rather
// than the URL — it only describes how to open the app that one time.
function readRoute() {
  return window.location.hash.startsWith("#/app") ? "app" : "landing";
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

  return (
    <>
      <Starfield />
      <ConceptOrrery entry={entry} onExit={exitToLanding} />
    </>
  );
}

export default App;
