# Converting a PDF of 300 SAT Questions into `questions.js`

This project reads all its questions from [src/questions.js](src/questions.js),
a plain JavaScript array. To go from a 300-question PDF to a working question
bank, you don't need any special tools beyond a text editor (and optionally
Claude/ChatGPT to speed up the grunt work). Two paths, pick whichever fits:

## Option A: Ask an AI assistant to do the extraction (fastest)

1. Open the PDF and copy the text for a batch of questions (20-50 at a time
   works well — large batches are more likely to get truncated or garbled).
2. Paste the batch into Claude (or another AI assistant) with a prompt like:

   > Convert the following SAT questions into JavaScript objects matching
   > this exact shape, and return ONLY a JS array (no markdown fences, no
   > commentary):
   >
   > ```js
   > {
   >   id: 1,
   >   text: "Question text",
   >   type: "multiple_choice", // or "free_response"
   >   choices: ["A) ...", "B) ...", "C) ...", "D) ..."], // omit for free_response
   >   correctAnswer: "A", // letter for multiple_choice, exact string for free_response
   >   explanation: "Why this is correct"
   > }
   > ```
   >
   > Continue numbering ids starting from {NEXT_ID}. Here are the questions:
   > [paste PDF text]

3. If the PDF includes an answer key at the back, paste that too so the
   assistant can fill in `correctAnswer` and write accurate `explanation`
   text instead of guessing.
4. Copy the returned array into `src/questions.js`, or use the helper
   script below (`scripts/mergeQuestions.mjs`) to merge batches safely.

## Option B: Manual entry with the template script

1. Run `node scripts/newQuestionTemplate.mjs 11 20` to print a blank
   template for question ids 11 through 20 (adjust the range to match how
   many you're adding). Redirect the output into a file if you like:
   `node scripts/newQuestionTemplate.mjs 11 20 > batch.js`
2. Fill in each field by hand while reading the PDF.
3. Paste the finished objects into the `questions` array in
   `src/questions.js`.

## Tips for a clean 300-question bank

- **Keep `id` unique and sequential.** The app doesn't require any specific
  order, but sequential ids make it easy to track how many you've entered
  and to spot duplicates.
- **`correctAnswer` for multiple choice must be just the letter** (`"A"`,
  `"B"`, `"C"`, or `"D"`) — not the full choice text.
- **`correctAnswer` for free response is matched loosely.** The app trims
  whitespace, lowercases, and collapses repeated spaces before comparing, so
  `"5"` matches `" 5 "` and `"Photosynthesis"` matches `"photosynthesis"`.
  It does NOT do fuzzy/numeric matching (e.g. `"5"` won't match `"5.0"`), so
  keep free-response answers as short, unambiguous strings — usually a
  number or a single word/phrase.
- **Escape quotes inside strings.** If a question or choice contains a
  double quote, either escape it (`\"`) or wrap the string in backticks.
- **Batch and checkpoint.** Convert 20-30 questions at a time, paste them
  into `questions.js`, run `npm run dev` and spot-check a few, then move to
  the next batch. This catches formatting mistakes early instead of after
  all 300 are typed in.
- **Validate before shipping a batch.** Run `node scripts/validateQuestions.mjs`
  after each batch to catch missing fields, duplicate ids, or malformed
  `correctAnswer` values before they reach the app.

## File structure recap

```
src/
  questions.js   <- the single source of truth for all questions
  App.jsx        <- quiz UI/logic, imports questions.js
scripts/
  newQuestionTemplate.mjs   <- prints blank question templates
  validateQuestions.mjs     <- sanity-checks questions.js
```
