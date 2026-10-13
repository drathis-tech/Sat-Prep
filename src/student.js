import { useSyncExternalStore } from "react";
import { shuffle } from "./quizUtils";

// The signed-in student and their lifetime stats, mirrored from the server.
// Every screen reads from this one store, so the score readout, the planet
// rings and the leaderboard highlight all update the moment an answer lands.
let state = {
  status: "loading", // loading | signedOut | guest | signedIn
  student: null,
  isOwner: false,
  totals: { answered: 0, correct: 0 },
  domains: {},
  seen: {},
};

const listeners = new Set();

function setState(next) {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener());
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useStudent() {
  return useSyncExternalStore(subscribe, () => state);
}

async function api(path, body) {
  let response;
  try {
    response = await fetch(path, {
      method: body === undefined ? "GET" : "POST",
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: "same-origin",
    });
  } catch {
    throw new Error("Can't reach the server. Check your connection and try again.");
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && state.status === "signedIn") signOutLocally();
    throw new Error(data.error || "Something went wrong. Please try again.");
  }
  return data;
}

function signOutLocally() {
  setState({
    status: "signedOut",
    student: null,
    isOwner: false,
    totals: { answered: 0, correct: 0 },
    domains: {},
    seen: {},
  });
}

function signIn(data) {
  rememberGuest(false);
  setState({ status: "signedIn", ...data });
}

// Guest mode — practising without an account — lasts for the browser tab.
const GUEST_KEY = "vegasat-guest";

function rememberGuest(on) {
  try {
    if (on) sessionStorage.setItem(GUEST_KEY, "1");
    else sessionStorage.removeItem(GUEST_KEY);
  } catch {
    // Storage unavailable — guest mode just won't survive a refresh.
  }
}

function wasGuest() {
  try {
    return sessionStorage.getItem(GUEST_KEY) === "1";
  } catch {
    return false;
  }
}

export async function loadSession() {
  try {
    signIn(await api("/api/me"));
  } catch {
    signOutLocally();
    if (wasGuest()) setState({ status: "guest" });
  }
}

// Practise without an account: answers are checked, but nothing is saved
// or scored.
export function continueAsGuest() {
  rememberGuest(true);
  signOutLocally();
  setState({ status: "guest" });
}

// Back to the sign-in screen from guest mode.
export function leaveGuest() {
  rememberGuest(false);
  signOutLocally();
}

export async function login({ nickname, pin, create, classCode }) {
  signIn(await api("/api/login", { nickname, pin, create, classCode }));
}

export async function logout() {
  try {
    await api("/api/logout", {});
  } finally {
    signOutLocally();
  }
}

// Sends one answer to the server to be checked and scored. Resolves to
// { correct, counted, correctAnswer, explanation, totals }.
export async function submitAnswer(question, given) {
  const result = await api("/api/answer", { questionId: question.id, given });

  // The server treated a signed-in student as a guest: the session has
  // ended, and carrying on would silently stop scoring their answers.
  if (result.guest && state.status === "signedIn") {
    signOutLocally();
    throw new Error("You've been signed out. Sign in again to keep scoring.");
  }

  const domains = { ...state.domains };
  if (result.counted) {
    const entry = domains[result.domain] || { attempted: 0, correct: 0 };
    domains[result.domain] = {
      attempted: entry.attempted + 1,
      correct: entry.correct + (result.correct ? 1 : 0),
    };
  }
  setState({
    totals: result.totals || state.totals,
    domains,
    seen: { ...state.seen, [question.id]: (state.seen[question.id] || 0) + 1 },
  });

  return result;
}

export function fetchLeaderboard() {
  return api("/api/leaderboard");
}

// Random order, but questions this student has answered least come first —
// so a pool is worked through completely before anything repeats.
export function orderForStudent(pool) {
  const seen = state.seen;
  return shuffle(pool).sort((a, b) => (seen[a.id] || 0) - (seen[b.id] || 0));
}
