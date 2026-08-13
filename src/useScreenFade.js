import { useContext } from "react";
import { ScreenFadeContext } from "./ScreenFadeContext";

export function useScreenFade() {
  const trigger = useContext(ScreenFadeContext);
  if (!trigger) throw new Error("useScreenFade must be used within a ScreenFadeProvider");
  return trigger;
}
