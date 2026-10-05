import { route, send } from "./_lib/http.js";
import { endSession } from "./_lib/auth.js";

export default route("POST", async (req, res) => {
  await endSession(req, res);
  send(res, 200, { ok: true });
});
