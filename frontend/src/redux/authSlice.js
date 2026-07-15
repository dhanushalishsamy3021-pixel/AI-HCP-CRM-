import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { loginRequest } from "../services/authService.js";

const storedToken = localStorage.getItem("accessToken");
const storedUser = localStorage.getItem("user");

export const login = createAsyncThunk("auth/login", async (credentials, { rejectWithValue }) => {
  try {
    const data = await loginRequest(credentials);
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.detail || "Login failed. Please check your credentials.");
  }
});

const authSlice = createSlice({
  name: "auth",
  initialState: {
    token: storedToken || null,
    user: storedUser ? JSON.parse(storedUser) : null,
    status: "idle", // idle | loading | succeeded | failed
    error: null,
  },
  reducers: {
    logout(state) {
      state.token = null;
      state.user = null;
      localStorage.removeItem("accessToken");
      localStorage.removeItem("user");
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.token = action.payload.access_token;
        state.user = action.payload.user;
        localStorage.setItem("accessToken", action.payload.access_token);
        localStorage.setItem("user", JSON.stringify(action.payload.user));
      })
      .addCase(login.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      });
  },
});

export const { logout } = authSlice.actions;
export default authSlice.reducer;
