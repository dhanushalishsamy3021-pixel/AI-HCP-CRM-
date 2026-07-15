import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  fetchInteractions,
  createInteractionRequest,
  updateInteractionRequest,
  deleteInteractionRequest,
} from "../services/interactionService.js";

export const loadInteractions = createAsyncThunk("interaction/load", async (_, { rejectWithValue }) => {
  try {
    return await fetchInteractions();
  } catch (err) {
    return rejectWithValue(err.response?.data?.detail || "Failed to load interactions.");
  }
});

export const addInteraction = createAsyncThunk("interaction/add", async (payload, { rejectWithValue }) => {
  try {
    return await createInteractionRequest(payload);
  } catch (err) {
    return rejectWithValue(err.response?.data?.detail || "Failed to save interaction.");
  }
});

export const editInteraction = createAsyncThunk("interaction/edit", async ({ id, payload }, { rejectWithValue }) => {
  try {
    return await updateInteractionRequest(id, payload);
  } catch (err) {
    return rejectWithValue(err.response?.data?.detail || "Failed to update interaction.");
  }
});

export const removeInteraction = createAsyncThunk("interaction/remove", async (id, { rejectWithValue }) => {
  try {
    await deleteInteractionRequest(id);
    return id;
  } catch (err) {
    return rejectWithValue(err.response?.data?.detail || "Failed to delete interaction.");
  }
});

const interactionSlice = createSlice({
  name: "interaction",
  initialState: {
    items: [],
    status: "idle",
    error: null,
    draftForm: {
      doctor_name: "",
      hospital: "",
      specialization: "",
      meeting_date: "",
      meeting_time: "",
      meeting_type: "IN_PERSON",
      attendees: "",
      topics_discussed: "",
      products: "",
      sentiment: "Neutral",
      outcomes: "",
      follow_up_actions: "",
      follow_up_date: "",
      notes: "",
    },
  },
  reducers: {
    updateDraftForm(state, action) {
      state.draftForm = { ...state.draftForm, ...action.payload };
    },
    clearDraftForm(state) {
      state.draftForm = {
        doctor_name: "",
        hospital: "",
        specialization: "",
        meeting_date: "",
        meeting_time: "",
        meeting_type: "IN_PERSON",
        attendees: "",
        topics_discussed: "",
        products: "",
        sentiment: "Neutral",
        outcomes: "",
        follow_up_actions: "",
        follow_up_date: "",
        notes: "",
      };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadInteractions.pending, (state) => {
        state.status = "loading";
      })
      .addCase(loadInteractions.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload;
      })
      .addCase(loadInteractions.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      .addCase(addInteraction.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
      })
      .addCase(editInteraction.fulfilled, (state, action) => {
        const idx = state.items.findIndex((i) => i.id === action.payload.id);
        if (idx !== -1) state.items[idx] = action.payload;
      })
      .addCase(removeInteraction.fulfilled, (state, action) => {
        state.items = state.items.filter((i) => i.id !== action.payload);
      });
  },
});

export const { updateDraftForm, clearDraftForm } = interactionSlice.actions;
export default interactionSlice.reducer;
