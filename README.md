# SAT Practice

A React + Vite single-page app for practicing SAT questions: one random
question at a time, multiple-choice or free-response, instant feedback with
explanations, and a running score.

## Features

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
  questions.js   # question bank (edit this to add more questions)
  App.jsx        # quiz UI and logic
  App.css        # component styles
  main.jsx       # React entry point
scripts/
  newQuestionTemplate.mjs   # prints blank question templates
  validateQuestions.mjs     # validates questions.js
CONVERTING_QUESTIONS.md     # guide for converting a PDF into questions.js
vercel.json                 # Vercel build configuration
```
