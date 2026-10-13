// Plain Node request/response helpers, so the same handlers run on Vercel
// and under the Vite dev middleware without any framework shims.

export function send(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

export function sendError(res, status, message) {
  send(res, status, { error: message });
}

export async function readJson(req) {
  if (req.body !== undefined) {
    if (typeof req.body === "string") {
      try {
        return JSON.parse(req.body);
      } catch {
        return {};
      }
    }
    return req.body || {};
  }
  let raw = "";
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 10_000) return {};
  }
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function readCookie(req, name) {
  const header = req.headers.cookie || "";
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) return decodeURIComponent(part.slice(eq + 1).trim());
  }
  return null;
}

// Wraps a handler with method checking and a catch-all, so a database
// outage surfaces as a clean JSON error instead of a hung request.
export function route(method, handler) {
  return async function wrapped(req, res) {
    if (req.method !== method) {
      res.setHeader("Allow", method);
      return sendError(res, 405, "Method not allowed");
    }
    try {
      await handler(req, res);
    } catch (err) {
      console.error(err);
      sendError(res, 500, "Something went wrong on the server. Please try again.");
    }
  };
}
