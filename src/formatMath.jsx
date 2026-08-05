// Parses plain-text math shorthand used in the question bank (sqrt(...),
// cube_root(...), eighth_root(...), base^exponent, a/b fractions) into an
// array of strings and JSX elements (radical symbols, <sup> exponents,
// stacked fractions) suitable for direct use as React children, e.g.
// <p>{formatMath(question.text)}</p>.

const RADICALS = [
  { prefix: "eighth_root(", symbol: "√", indexSup: "8" },
  { prefix: "cube_root(", symbol: "∛" },
  { prefix: "sqrt(", symbol: "√", conditionalWrap: true },
];

// Finds the index of the ')' that matches the '(' at openIndex.
function findMatchingParen(str, openIndex) {
  let depth = 0;
  for (let i = openIndex; i < str.length; i++) {
    if (str[i] === "(") depth++;
    else if (str[i] === ")") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

// True if the string contains a +, -, *, or / that isn't nested inside its
// own parentheses and isn't a leading unary sign — i.e. it's more than one term.
function hasTopLevelOperator(str) {
  let depth = 0;
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    if (c === "(") depth++;
    else if (c === ")") depth--;
    else if (depth === 0 && i > 0 && "+-*/".includes(c)) {
      return true;
    }
  }
  return false;
}

// Matches a single "simple operand" for a fraction, starting exactly at
// `pos`: a (possibly multi-digit, possibly negative) number, an isolated
// single letter, or a balanced parenthesized group. Returns null if `pos`
// isn't the start of one of those, so slashes in prose ("and/or"), units
// ("cm/s"), and multi-letter tokens ("EF/FG") never match.
function matchOperand(str, pos) {
  const ch = str[pos];

  if (ch === "(") {
    const close = findMatchingParen(str, pos);
    if (close === -1) return null;
    return { isParen: true, inner: str.slice(pos + 1, close), end: close + 1 };
  }

  if (ch === "-" || /[0-9]/.test(ch || "")) {
    // Must be a fresh token start, not the tail of an already-started run
    // (e.g. the "5" in "25"), and a leading "-" must be a unary sign, not
    // a subtraction operator glued to a preceding term ("10-4/2").
    if (pos > 0 && /[a-zA-Z0-9]/.test(str[pos - 1])) return null;
    let j = pos;
    if (str[j] === "-") j++;
    const digitsStart = j;
    while (j < str.length && /[0-9]/.test(str[j])) j++;
    if (j === digitsStart) return null; // lone "-" with no digits following
    if (str[j] === "." && /[0-9]/.test(str[j + 1] || "")) {
      j++;
      while (j < str.length && /[0-9]/.test(str[j])) j++;
    }
    return { isParen: false, text: str.slice(pos, j), end: j };
  }

  if (/[a-zA-Z]/.test(ch || "")) {
    const prevIsAlnum = pos > 0 && /[a-zA-Z0-9]/.test(str[pos - 1]);
    const nextIsAlnum = /[a-zA-Z0-9]/.test(str[pos + 1] || "");
    if (prevIsAlnum || nextIsAlnum) return null; // part of a longer word/unit
    return { isParen: false, text: ch, end: pos + 1 };
  }

  return null;
}

// True only if `str` is, in its entirety, exactly one operand, a "/", and
// one more operand — nothing else. Used to detect a fraction that's wrapped
// in otherwise-redundant parentheses, e.g. the "a/6" inside "(a/6)x".
function parseWholeFraction(str) {
  const numerator = matchOperand(str, 0);
  if (!numerator || str[numerator.end] !== "/") return null;
  const denominator = matchOperand(str, numerator.end + 1);
  if (!denominator || denominator.end !== str.length) return null;
  return { numerator, denominator };
}

function formatOperand(operand) {
  return operand.isParen ? formatMath(operand.inner) : [operand.text];
}

function renderFraction(numerator, denominator, key) {
  return (
    <span className="stacked-fraction" key={key}>
      <span className="stacked-fraction-num">{numerator}</span>
      <span className="stacked-fraction-den">{denominator}</span>
    </span>
  );
}

export function formatMath(text) {
  if (text == null) return [text];
  const str = String(text);
  const out = [];
  let plain = "";
  let i = 0;

  function flushPlain() {
    if (plain) {
      out.push(plain);
      plain = "";
    }
  }

  while (i < str.length) {
    const radical = RADICALS.find((r) => str.startsWith(r.prefix, i));

    if (radical) {
      const openIdx = i + radical.prefix.length - 1;
      const closeIdx = findMatchingParen(str, openIdx);
      if (closeIdx !== -1) {
        const inner = str.slice(openIdx + 1, closeIdx);
        const formattedInner = formatMath(inner);
        const wrap = radical.conditionalWrap && hasTopLevelOperator(inner);

        flushPlain();
        if (radical.indexSup) {
          out.push(<sup key={out.length}>{radical.indexSup}</sup>);
        }
        out.push(radical.symbol);
        if (wrap) out.push("(");
        out.push(...formattedInner);
        if (wrap) out.push(")");

        i = closeIdx + 1;
        continue;
      }
      // Unbalanced parens (shouldn't happen with valid data) — fall through
      // and treat this position as plain text instead of crashing.
    }

    // A parenthesized group whose entire content is exactly a fraction —
    // e.g. the "(a/6)" in "(a/6)x" — renders as the stacked fraction with
    // the now-redundant wrapping parentheses dropped.
    if (str[i] === "(") {
      const close = findMatchingParen(str, i);
      if (close !== -1) {
        const bare = parseWholeFraction(str.slice(i + 1, close));
        if (bare) {
          flushPlain();
          out.push(
            renderFraction(formatOperand(bare.numerator), formatOperand(bare.denominator), out.length)
          );
          i = close + 1;
          continue;
        }
      }
    }

    if (str[i] === "^") {
      const expStart = i + 1;
      let expContent = null;
      let expEnd = -1;

      if (str[expStart] === "(") {
        const close = findMatchingParen(str, expStart);
        if (close !== -1) {
          expContent = str.slice(expStart + 1, close);
          expEnd = close;
        }
      } else if (/[0-9]/.test(str[expStart] || "")) {
        let j = expStart;
        while (j < str.length && /[0-9.]/.test(str[j])) j++;
        expContent = str.slice(expStart, j);
        expEnd = j - 1;
      } else if (/[a-zA-Z]/.test(str[expStart] || "")) {
        expContent = str[expStart];
        expEnd = expStart;
      }

      if (expContent) {
        flushPlain();
        out.push(<sup key={out.length}>{formatMath(expContent)}</sup>);
        i = expEnd + 1;
        continue;
      }
      // '^' with no recognizable exponent after it — treat as literal text.
    }

    // General a/b fraction, where each side is a number, an isolated single
    // letter, or a parenthesized group — e.g. "49/2", "a/6", "(x+8)/3".
    const numerator = matchOperand(str, i);
    if (numerator && str[numerator.end] === "/") {
      const denominator = matchOperand(str, numerator.end + 1);
      if (denominator) {
        flushPlain();
        out.push(
          renderFraction(formatOperand(numerator), formatOperand(denominator), out.length)
        );
        i = denominator.end;
        continue;
      }
    }

    plain += str[i];
    i++;
  }

  flushPlain();
  return out;
}

export default formatMath;
