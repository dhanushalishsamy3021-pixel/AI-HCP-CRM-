import api from "./api.js";

export async function loginRequest({ email, password }) {
  const { data } = await api.post("/login", { email, password });
  return data;
}
