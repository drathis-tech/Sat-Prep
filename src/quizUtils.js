import { questions } from "./questions";

export function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function normalizeAnswer(str) {
  return String(str).trim().toLowerCase().replace(/\s+/g, " ");
}

export function isAnswerCorrect(question, given) {
  if (!given) return false;
  if (question.type === "multiple_choice") {
    return given === question.correctAnswer;
  }
  return normalizeAnswer(given) === normalizeAnswer(question.correctAnswer);
}

export function getSubjectPool(subject) {
  return questions.filter((q) => q.subject === subject);
}

// filter: { subject: "all" | "reading_writing" | "math", domain: string|null, skill: string|null }
export function filterQuestions(filter) {
  return questions.filter((q) => {
    if (filter.skill) return q.domain === filter.domain && q.skill === filter.skill;
    if (filter.subject && filter.subject !== "all") return q.subject === filter.subject;
    return true;
  });
}

export function subjectLabel(subject) {
  return subject === "reading_writing" ? "Reading & Writing" : "Math";
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
