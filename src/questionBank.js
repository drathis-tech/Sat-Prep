// The browser-safe question bank: every question, without correctAnswer or
// explanation (see publicQuestionBank in vite.config.js). All browser code
// imports questions from here, never from ./questions.js.
export { questions } from "virtual:question-bank";
