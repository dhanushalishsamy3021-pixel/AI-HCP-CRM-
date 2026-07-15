import api from "./api.js";

export async function fetchInteractions() {
  const { data } = await api.get("/interaction");
  return data;
}

export async function createInteractionRequest(payload) {
  const { data } = await api.post("/interaction", payload);
  return data;
}

export async function updateInteractionRequest(id, payload) {
  const { data } = await api.put(`/interaction/${id}`, payload);
  return data;
}

export async function deleteInteractionRequest(id) {
  const { data } = await api.delete(`/interaction/${id}`);
  return data;
}

export async function fetchHcps() {
  const { data } = await api.get("/hcp");
  return data;
}
