# SAT Practice

A React + Vite app for practicing SAT questions, with a competition mode:
students sign in with a nickname, answer questions from the bank with instant
feedback and explanations, and compete on a shared leaderboard.

The app opens on a public landing page (`#/`); the practice hub lives at
`#/app` and requires a student to be signed in.

## Features

- Landing page with a parallax star field, an FAQ, and calls to action
- An orrery hub: nine full-screen planet stages — one per SAT domain, plus
  the timed test — each starting practice already filtered to that domain
- Random question order each session (re-shuffles when you complete the set)
- Multiple choice (A/B/C/D) and free-response question types
- Answer checking with correct/incorrect highlighting
- Explanation shown after every answer
- Student sign-in (nickname + 4-digit PIN), a lifetime score with a live
  readout, and the "Mission Control" leaderboard
- Answers are checked on the server — correct answers and explanations are
  not sent to the browser until a student has submitted
- Mobile-friendly layout, tested down to small screens (works well on
  Chromebooks)

## Getting started

```bash
npm install
npm run dev
```

Open the printed local URL (typically http://localhost:5173) in your
browser. In development the `/api` routes run inside the Vite dev server
against a local database stored in `.local-db/` (delete that folder to wipe
local test students), so no Vercel account or hosted database is needed.

## Competition mode

### Planets

Stages 1-8 of the orrery are the eight `domain` values in the question bank
(Information and Ideas, Craft and Structure, Standard English Conventions,
Expression of Ideas, Algebra, Advanced Math, Problem-Solving and Data
Analysis, Geometry and Trigonometry). New questions join a planet
automatically as long as their `domain` is one of these eight. Each stage
shows the signed-in student's record for that domain.

### Scoring

The scoring function lives in [shared/scoring.js](shared/scoring.js) and is
used by both the server (leaderboard) and the browser (live readout):

```
accuracy = correct ÷ answered
score    = 1000 × accuracy × answered ÷ (answered + 50)
```

Scores are lifetime, questions answered are uncapped, the score never
exceeds 1000, and below 60% accuracy it shows 0. Practice and timed-test
answers both count; blank timed-test answers are not submitted.

To stop a student re-submitting a question they have just read the
explanation for, a repeat of the same question only counts again after the
student has answered 15 other questions (`REPEAT_COOLDOWN` in
[api/answer.js](api/answer.js)). Until then it is shown as "practice only".
Practice sets also serve the questions a student has answered least first.

### Data

Postgres, three tables, created automatically on first request
([api/_lib/db.js](api/_lib/db.js)):

- `students` — nickname, PIN hash, lifetime `answered` / `correct` counts
- `answers` — every submitted answer (student, question, domain, given
  answer, right/wrong, whether it counted)
- `sessions` — sign-in sessions

To reset a forgotten PIN or remove a student, edit the `students` table in
your database provider's SQL console (deleting a student row removes their
answers too).

## Adding your own questions

All questions live in [src/questions.js](src/questions.js). That file
includes the answers, so only the server reads it; the browser imports an
answer-free copy through `src/questionBank.js` (the build fails if browser
code imports `src/questions.js` directly). See
[CONVERTING_QUESTIONS.md](CONVERTING_QUESTIONS.md) for a full guide on
turning a PDF of 300 SAT questions into entries for this file, plus helper
scripts:

```bash
# Print blank templates for ids 11-20
node scripts/newQuestionTemplate.mjs 11 20

# Validate src/questions.js for missing fields, duplicate ids, etc.
npm run validate
```

## Building for production

```bash
npm run build
npm run preview   # serve the production build locally to sanity-check it
```

The build output goes to `dist/`.

## Deploying to Vercel

The app is a Vite front end plus serverless functions in `api/`, which
Vercel picks up automatically. It needs a Postgres database:

1. In the Vercel dashboard, open the project → **Storage** → **Create
   Database** → **Neon** (Postgres), and connect it to the project. This
   sets the `DATABASE_URL` environment variable.
2. Redeploy. The tables are created on the first request.

Build settings are the Vite defaults (`vercel.json` pins them explicitly):

- **Framework preset:** Vite
- **Build command:** `npm run build`
- **Output directory:** `dist`

### Option A: Vercel dashboard

1. Push this project to a GitHub/GitLab/Bitbucket repo.
2. Go to [vercel.com/new](https://vercel.com/new) and import the repo.
3. Vercel auto-detects the Vite preset — accept the defaults and deploy.

### Option B: Vercel CLI

```bash
npm install -g vercel
vercel        # preview deployment
vercel --prod # production deployment
```

## Project structure

```
api/                # Vercel serverless functions: login, logout, me,
                    # answer, leaderboard (+ _lib/ for database and sessions)
shared/
  scoring.js        # the score formula (server + browser)
  checkAnswer.js    # answer checking (server only)
src/
  questions.js      # question bank with answers (server only)
  questionBank.js   # answer-free bank for the browser
  student.js        # signed-in student + live stats store
  Login.jsx         # nickname + PIN sign-in
  MissionControl.jsx  # leaderboard
  ScoreReadout.jsx  # live lifetime score
  App.jsx           # hash routing, plus the app shell's screen state
  Landing.jsx/.css  # landing page: hero, FAQ, calls to action
  Orrery.jsx/.css   # the app's hub — nine planet stages, one per domain
  App.css           # app shell chrome and component styles
  main.jsx          # React entry point
public/
  landing/          # hero and orrery planet art
scripts/
  newQuestionTemplate.mjs   # prints blank question templates
  validateQuestions.mjs     # validates questions.js
CONVERTING_QUESTIONS.md     # guide for converting a PDF into questions.js
vercel.json                 # Vercel build configuration
```

## Screens

`#/` is the landing page (`src/Landing.jsx`) — hero, FAQ, calls to action.
`#/app` shows the sign-in screen (`src/Login.jsx`) until a student is signed
in, then the app shell (`src/App.jsx`), which has three screens:

- **the orrery** (`src/Orrery.jsx`), the hub: nine full-screen planet stages,
  advanced by wheel, arrow keys, swipe, or the tick rail
- **practice** (`src/PracticeMode.jsx`), a filtered set of up to 30 questions
  ending in a per-skill results breakdown
- **the timed test** (`src/TimedTest.jsx`), a full digital-SAT simulation

Stage 0 of the orrery launches the timed test; stages 1-8 are the eight SAT
domains, and each carries the exact `subject`/`domain` pair from the question
bank, so "Start these questions" opens practice already filtered to it. Adding
a domain means adding a stage to `STAGES` in `Orrery.jsx` and its planet art.

A landing CTA hands an *entry intent* to the shell, which resolves it on mount:

| Landing control | Entry intent | Opens |
| --- | --- | --- |
| Start practicing / Practice sets / Orrery | `null` | the orrery |
| Browse the question bank | `{ type: "browse" }` | the orrery with Browse open |
| (orrery stage 0) | `{ type: "timed" }` | the timed test |
| (orrery stages 1-8) | `{ type: "domain", subject, domain }` | filtered practice |

Counts shown on the page ("270 questions", "8 domains") are read from the
question bank at render time rather than hard-coded, so they stay honest as
questions are added.

Planet art lives in `public/landing/`. The nine orrery images (~16 MB total)
are only requested once the orrery is opened, so they stay off the landing
page's initial load.

## The practice screen

A full-screen takeover with its own header and Exit, so the app shell's Browse
and Return chrome stands down while it is up. One question at a time:

- multiple choice, or a free-response field, with the answer key and
  explanation revealed on **Check answer**
- a **Reference** sheet of the formulas the digital SAT provides, rendered
  with KaTeX (`REFERENCE` in `PracticeMode.jsx`)
- the **Calculator** pill drives the existing Desmos panel — `Calculator.jsx`
  takes optional `open`/`onOpenChange` props and hides its own toggle when
  controlled. The timed test still uses it uncontrolled, with its built-in
  button
- a **passage** column, rendered only when a question has a `passage` field.
  Nothing in the bank has one yet, so it stays collapsed until some do

A set is capped at `SET_SIZE` (30) — or the size of the pool, whichever is
smaller — so that it ends and can be scored. Finishing one opens the results
screen: overall percentage, then a per-skill tally sorted **weakest first**,
which is the ordering that makes it useful.

Choices normally read `"A. …"`; the letter is parsed off for the badge, and a
choice missing its prefix falls back to its position so the badge and answer
key stay in step.

## The timed test

Five screens sharing the practice screen's language: a briefing, a running
module, the break, a pause, and the debrief. The question body reuses the
`.pr-*` classes from `Practice.css` — a question is a question — while
`TimedTest.css` holds only what practice has no equivalent for: the clock
(which turns red and pulses for the last five minutes), the module list, the
big break/pause clock, and the per-module debrief.

Unlike practice it gives no feedback between questions, which is how the real
test behaves. Math modules get the same Calculator and Reference controls.

Both screens latch on advance (`advancingRef`): `triggerFade` defers its
callback, so without it two fast clicks on Next advance twice off a single
question — which used to run the index past the end of a module and blank the
app. `Shell` is declared at module scope for the same class of reason: nested
inside the component it would be a new component type every render, and the
once-a-second clock tick would remount the question and drop focus out of the
answer field.
