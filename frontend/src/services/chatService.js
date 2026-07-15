import api from "./api.js";

export async function sendChatMessage(message, sessionId) {
  const { data } = await api.post("/chat", { message, session_id: sessionId });
  return data;
}
