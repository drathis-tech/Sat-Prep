#!/usr/bin/env node
// Prints blank question object templates for a range of ids.
//
// Usage:
//   node scripts/newQuestionTemplate.mjs <startId> <endId>
//
// Example:
//   node scripts/newQuestionTemplate.mjs 11 20
//   node scripts/newQuestionTemplate.mjs 11 20 > batch.js

const [, , startArg, endArg] = process.argv;

const start = Number(startArg);
const end = Number(endArg ?? startArg);

if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < start) {
  console.error("Usage: node scripts/newQuestionTemplate.mjs <startId> <endId>");
  process.exit(1);
}

const blocks = [];
for (let id = start; id <= end; id++) {
  blocks.push(`  {
    id: ${id},
    text: "",
    type: "multiple_choice", // or "free_response"
    choices: ["A) ", "B) ", "C) ", "D) "], // omit this line for free_response
    correctAnswer: "",
    explanation: "",
  },`);
}

console.log(blocks.join("\n"));
