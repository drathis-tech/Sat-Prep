import { route, send, sendError } from "./_lib/http.js";
import { requireStudent } from "./_lib/auth.js";
import { getStudentState } from "./_lib/state.js";

export default route("GET", async (req, res) => {
  const studentId = await requireStudent(req, res);
  if (!studentId) return;
  const state = await getStudentState(studentId);
  if (!state) return sendError(res, 401, "Not signed in");
  send(res, 200, state);
});
