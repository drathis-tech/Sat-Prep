import { useEffect } from "react";
import ConceptOrrery from "./ConceptOrrery";
import "./App.css";

function App() {
  useEffect(() => {
    document.title = "SAT Practice";
  }, []);

  return <ConceptOrrery />;
}

export default App;
