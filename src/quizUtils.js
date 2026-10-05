import { questions } from "./questionBank";

export function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function getSubjectPool(subject) {
  return questions.filter((q) => q.subject === subject);
}

// filter: { subject: "all" | "reading_writing" | "math", domain: string|null, skill: string|null }
export function filterQuestions(filter) {
  return questions.filter((q) => {
    if (filter.skill) return q.domain === filter.domain && q.skill === filter.skill;
    if (filter.domain) return q.domain === filter.domain;
    if (filter.subject && filter.subject !== "all") return q.subject === filter.subject;
    return true;
  });
}

export function subjectLabel(subject) {
  return subject === "reading_writing" ? "Reading & Writing" : "Math";
}

// Plain substring match over question text — the question bank is small
// enough (~270 items) that this runs comfortably on every keystroke with
// no debouncing or indexing needed.
export function searchQuestions(query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return questions.filter((item) => item.text.toLowerCase().includes(q));
}

// Distinct domain/skill combinations grouped by domain, in first-seen order.
export const domainGroups = (() => {
  const order = [];
  const bySubjectDomain = new Map();
  for (const q of questions) {
    const key = `${q.subject}::${q.domain}`;
    if (!bySubjectDomain.has(key)) {
      bySubjectDomain.set(key, { subject: q.subject, domain: q.domain, skills: [] });
      order.push(key);
    }
    const group = bySubjectDomain.get(key);
    if (!group.skills.includes(q.skill)) group.skills.push(q.skill);
  }
  return order.map((key) => bySubjectDomain.get(key));
})();

const LETTERS = ["A", "B", "C", "D"];

// Choices normally read "A. …" (a couple in the bank are missing the prefix
// entirely, so fall back to position) — the letter drives both the badge and
// the match against `correctAnswer`, so the two must agree.
export function parseChoice(choice, index) {
  const prefix = /^([A-D])[.)]\s*/.exec(choice.trim());
  if (!prefix) return { letter: LETTERS[index], body: choice };
  return { letter: prefix[1], body: choice.trim().slice(prefix[0].length) };
}
