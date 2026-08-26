#!/usr/bin/env node
// Sanity-checks src/questions.js for common data-entry mistakes.
//
// Usage:
//   node scripts/validateQuestions.mjs

import { questions } from "../src/questions.js";

const errors = [];
const seenIds = new Set();

questions.forEach((q, index) => {
  const where = `Question at array index ${index} (id: ${q.id ?? "MISSING"})`;

  if (q.id === undefined || q.id === null) {
    errors.push(`${where}: missing "id"`);
  } else if (seenIds.has(q.id)) {
    errors.push(`${where}: duplicate id ${q.id}`);
  } else {
    seenIds.add(q.id);
  }

  if (!q.text || typeof q.text !== "string" || !q.text.trim()) {
    errors.push(`${where}: missing or empty "text"`);
  }

  if (q.type !== "multiple_choice" && q.type !== "free_response") {
    errors.push(`${where}: "type" must be "multiple_choice" or "free_response", got ${JSON.stringify(q.type)}`);
  }

  if (q.type === "multiple_choice") {
    if (!Array.isArray(q.choices) || q.choices.length < 2) {
      errors.push(`${where}: multiple_choice question needs a "choices" array with at least 2 options`);
    } else {
      // Every option must carry its own "A. " style label. Two questions once
      // shipped with a stray PDF-extraction fragment as an extra array entry,
      // which shifted the labels and made the real answer unselectable — the
      // old charAt(0) check waved it through, so this one is strict.
      const EXPECTED = ["A", "B", "C", "D"];
      if (q.choices.length !== 4) {
        errors.push(`${where}: expected 4 choices, got ${q.choices.length}`);
      }
      const letters = [];
      q.choices.forEach((c, ci) => {
        const m = /^([A-D])[.)]\s/.exec(String(c).trim());
        if (!m) {
          errors.push(
            `${where}: choice ${ci} does not start with an "A. " style label: ${JSON.stringify(String(c).trim().slice(0, 40))}`
          );
          letters.push(null);
        } else {
          letters.push(m[1]);
        }
      });
      const present = letters.filter(Boolean);
      if (present.length === 4 && present.join("") !== EXPECTED.join("")) {
        errors.push(`${where}: choice letters should read A, B, C, D in order, got ${present.join(", ")}`);
      }
      if (!letters.includes(q.correctAnswer)) {
        errors.push(`${where}: "correctAnswer" (${JSON.stringify(q.correctAnswer)}) does not match any choice letter (${present.join(", ") || "none"})`);
      }
      const dupLetters = present.filter((l, i) => present.indexOf(l) !== i);
      if (dupLetters.length) {
        errors.push(`${where}: duplicate choice letters: ${dupLetters.join(", ")}`);
      }
    }
  } else if (q.type === "free_response") {
    if (Array.isArray(q.choices) && q.choices.length > 0) {
      errors.push(`${where}: free_response question should not have a non-empty "choices" array`);
    }
    if (!q.correctAnswer || typeof q.correctAnswer !== "string" || !q.correctAnswer.trim()) {
      errors.push(`${where}: missing or empty "correctAnswer"`);
    }
  }

  if (!q.explanation || typeof q.explanation !== "string" || !q.explanation.trim()) {
    errors.push(`${where}: missing or empty "explanation"`);
  }
});

if (errors.length) {
  console.error(`Found ${errors.length} problem(s) in ${questions.length} questions:\n`);
  errors.forEach((e) => console.error(`  - ${e}`));
  process.exit(1);
} else {
  console.log(`All ${questions.length} questions passed validation.`);
}
