# SAT Practice

A React + Vite single-page app for practicing SAT questions: one random
question at a time, multiple-choice or free-response, instant feedback with
explanations, and a running score.

The app opens on a landing page (`#/`); the practice hub lives at `#/app`.

## Features

- Landing page with a parallax star field, an FAQ, and calls to action
- An orrery hub: nine full-screen planet stages — one per SAT domain, plus
  the timed test — each starting practice already filtered to that domain
- Random question order each session (re-shuffles when you complete the set)
- Multiple choice (A/B/C/D) and free-response question types
- Answer checking with correct/incorrect highlighting
- Explanation shown after every answer
- Score tracker (X/Y correct)
- Mobile-friendly layout, tested down to small screens (works well on
  Chromebooks)

## Getting started

```bash
npm install
npm run dev
```

Open the printed local URL (typically http://localhost:5173) in your
browser.

## Adding your own questions

All questions live in [src/questions.js](src/questions.js). See
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

This is a static Vite app, so Vercel needs no special configuration beyond
the defaults (`vercel.json` in this repo pins them explicitly):

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
src/
  questions.js      # question bank (edit this to add more questions)
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
`#/app` is the app shell (`src/App.jsx`), which has three screens:

- **the orrery** (`src/Orrery.jsx`), the hub: nine full-screen planet stages,
  advanced by wheel, arrow keys, swipe, or the tick rail
- **practice** (`src/PracticeMode.jsx`), a filtered set of up to 30 questions
  ending in a per-skill results breakdown
- **the timed test**, a full digital-SAT simulation

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
