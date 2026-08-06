import katex from "katex";

// Splits a string on $...$ delimited LaTeX segments, respecting "\$" as an
// escaped literal dollar sign (used for things like currency amounts that
// happen to sit in the same string as real math notation).
function splitMathSegments(text) {
  const segments = [];
  let buffer = "";
  let i = 0;

  while (i < text.length) {
    if (text[i] === "\\" && text[i + 1] === "$") {
      buffer += "$";
      i += 2;
      continue;
    }

    if (text[i] === "$") {
      let j = i + 1;
      let latex = "";
      let closed = false;
      while (j < text.length) {
        if (text[j] === "\\" && text[j + 1] === "$") {
          latex += "\\$";
          j += 2;
          continue;
        }
        if (text[j] === "$") {
          closed = true;
          break;
        }
        latex += text[j];
        j++;
      }
      if (closed) {
        if (buffer) {
          segments.push({ math: false, text: buffer });
          buffer = "";
        }
        segments.push({ math: true, text: latex });
        i = j + 1;
        continue;
      }
      // No matching closing "$" — treat this one as a literal character.
      buffer += text[i];
      i++;
      continue;
    }

    buffer += text[i];
    i++;
  }

  if (buffer) segments.push({ math: false, text: buffer });
  return segments;
}

const ROMAN_MARKER = /^(I{1,3}|IV)\.\s/;

// Most single newlines in the source data are incidental line-wrap
// artifacts from however the question text was originally extracted, and
// are meant to be collapsed to a space (the default browser behavior for
// plain text, left alone here). Only two patterns are actually structural:
// a blank line (2+ newlines, used to separate a standalone equation from
// the prose that follows it) and a newline directly before a Roman-numeral
// list marker ("I.", "II.", "III.") — both get rendered as a real line break.
function splitPlainWithBreaks(text) {
  const parts = [];
  let buffer = "";
  let i = 0;

  while (i < text.length) {
    if (text[i] === "\n") {
      let j = i;
      while (text[j] === "\n") j++;
      const isParagraphBreak = j - i >= 2;
      const isRomanBreak = !isParagraphBreak && ROMAN_MARKER.test(text.slice(j));

      if (isParagraphBreak || isRomanBreak) {
        parts.push(buffer, "BR");
        buffer = "";
        i = j;
        continue;
      }

      buffer += text[i];
      i++;
      continue;
    }

    buffer += text[i];
    i++;
  }

  parts.push(buffer);
  return parts;
}

// Renders a string that may contain $...$ delimited LaTeX into an array of
// plain strings and KaTeX-rendered spans, suitable as React children, e.g.
// <p>{renderMath(question.text)}</p>.
export function renderMath(text) {
  if (text == null) return [text];
  const segments = splitMathSegments(String(text));

  const out = [];
  segments.forEach((seg, segIdx) => {
    if (seg.math) {
      const html = katex.renderToString(seg.text, { throwOnError: false, displayMode: false });
      out.push(
        <span key={`m${segIdx}`} className="katex-math" dangerouslySetInnerHTML={{ __html: html }} />
      );
      return;
    }

    splitPlainWithBreaks(seg.text).forEach((part, partIdx) => {
      if (part === "BR") {
        out.push(<br key={`b${segIdx}-${partIdx}`} />);
      } else if (part) {
        out.push(part);
      }
    });
  });

  return out;
}

export default renderMath;
