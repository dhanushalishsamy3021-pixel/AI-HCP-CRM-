import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { sendChatMessage } from "../services/chatService.js";

export const sendMessage = createAsyncThunk("chat/send", async ({ message, sessionId }, { rejectWithValue }) => {
  try {
    return await sendChatMessage(message, sessionId);
  } catch (err) {
    return rejectWithValue(err.response?.data?.detail || "The AI assistant could not process that message.");
  }
});

function newSessionId() {
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const chatSlice = createSlice({
  name: "chat",
  initialState: {
    sessionId: newSessionId(),
    messages: [
      {
        role: "assistant",
        content:
          "Hi, I'm Aria. Tell me about your visit — e.g. \"Today I met Dr Raj at Apollo Hospital, discussed Diabetes medicine, follow-up next Tuesday.\"",
      },
    ],
    status: "idle",
    error: null,
  },
  reducers: {
    resetChat(state) {
      state.sessionId = newSessionId();
      state.messages = [state.messages[0]];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(sendMessage.pending, (state, action) => {
        state.status = "loading";
        state.messages.push({ role: "user", content: action.meta.arg.message });
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.messages.push({
          role: "assistant",
          content: action.payload.reply,
          extractedData: action.payload.extracted_data,
          interactionId: action.payload.interaction_id,
        });
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
        state.messages.push({ role: "assistant", content: `Sorry, something went wrong: ${action.payload}` });
      });
  },
});

export const { resetChat } = chatSlice.actions;
export default chatSlice.reducer;
