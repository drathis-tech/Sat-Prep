// Parses plain-text math shorthand used in the question bank (sqrt(...),
// cube_root(...), eighth_root(...), base^exponent) into an array of strings
// and JSX elements (radical symbols, <sup> exponents) suitable for direct
// use as React children, e.g. <p>{formatMath(question.text)}</p>.

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

    plain += str[i];
    i++;
  }

  flushPlain();
  return out;
}

export default formatMath;
