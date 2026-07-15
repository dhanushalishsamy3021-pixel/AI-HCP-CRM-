import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import {
  HiOutlinePaperAirplane,
  HiOutlineSearch,
  HiOutlineSparkles,
  HiOutlineMicrophone,
  HiOutlinePlus,
  HiOutlineX,
} from "react-icons/hi";

import Sidebar from "../components/Sidebar.jsx";
import Navbar from "../components/Navbar.jsx";
import FormInput from "../components/FormInput.jsx";
import ChatBubble from "../components/ChatBubble.jsx";
import Loader from "../components/Loader.jsx";
import { addInteraction, updateDraftForm, clearDraftForm } from "../redux/interactionSlice.js";
import { sendMessage, resetChat } from "../redux/chatSlice.js";

const INTERACTION_TYPES = [
  { value: "IN_PERSON", label: "Meeting" },
  { value: "VIDEO_CALL", label: "Video Call" },
  { value: "PHONE_CALL", label: "Phone Call" },
  { value: "CONFERENCE", label: "Conference" },
];

const schema = z.object({
  doctor_name: z.string().min(2, "HCP name is required"),
  hospital: z.string().optional().or(z.literal("")),
  specialization: z.string().optional().or(z.literal("")),
  meeting_date: z.string().optional().or(z.literal("")),
  meeting_time: z.string().optional().or(z.literal("")),
  meeting_type: z.string().default("IN_PERSON"),
  attendees: z.string().optional().or(z.literal("")),
  topics_discussed: z.string().optional().or(z.literal("")),
  products: z.string().optional().or(z.literal("")),
  sentiment: z.string().default("Neutral"),
  outcomes: z.string().optional().or(z.literal("")),
  follow_up_actions: z.string().optional().or(z.literal("")),
  follow_up_date: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

function formatDateOnly(isoStr) {
  try {
    const d = new Date(isoStr);
    if (isNaN(d)) return "";
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  } catch {
    return "";
  }
}

function formatTimeOnly(isoStr) {
  try {
    const d = new Date(isoStr);
    if (isNaN(d)) return "";
    const hh = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${min}`;
  } catch {
    return "";
  }
}

/* ------------------------------------------------------------------ */
/* Reusable Section Header                                             */
/* ------------------------------------------------------------------ */
function SectionHeader({ title, description, className = "" }) {
  return (
    <div className={`mb-4 ${className}`}>
      <h3 className="text-sm font-bold text-slate-800 tracking-wide uppercase">{title}</h3>
      <p className="text-xs text-slate-400 mt-1 leading-relaxed max-w-xl">{description}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Reusable Modal Component                                            */
/* ------------------------------------------------------------------ */
function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">{title}</h4>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <HiOutlineX size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {children}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Voice Note Modal Content                                           */
/* ------------------------------------------------------------------ */
function VoiceNoteModalContent({ onSummarize, onClose }) {
  const [status, setStatus] = useState("idle"); // 'idle' | 'recording' | 'processing'
  const [seconds, setSeconds] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (status === "recording") {
      timerRef.current = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      if (status === "idle") {
        setSeconds(0);
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status]);

  const formatTime = (totalSeconds) => {
    const mins = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
    const secs = String(totalSeconds % 60).padStart(2, "0");
    return `${mins}:${secs}`;
  };

  const handleStart = () => {
    setStatus("recording");
  };

  const handleStop = () => {
    setStatus("processing");
    setTimeout(() => {
      onSummarize({
        doctor_name: "Dr. Mugil",
        hospital: "Apollo Hospital",
        specialization: "Heart Doctor",
        meeting_date: new Date().toISOString().split("T")[0],
        meeting_time: new Date().toTimeString().split(" ")[0].slice(0, 5),
        meeting_type: "IN_PERSON",
        attendees: "Dr. Mugil, Jane Doe (Sales rep)",
        topics_discussed: "Presented the new clinical studies on OmniBoost 10mg Tablets and distributed sample kits.",
        sentiment: "Positive",
        outcomes: "Dr. Mugil expressed high interest and agreed to consider prescribing it for moderate cases.",
        follow_up_actions: "Provide OmniBoost Phase III KOL report and additional brochures next week.",
        follow_up_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        materials: ["OmniBoost Phase III KOL report"],
        samples: [{ name: "OmniBoost 10mg Tablets", qty: 2 }],
      });
      setStatus("idle");
      toast.success("Voice note summarized successfully!");
      onClose();
    }, 2200);
  };

  return (
    <div className="flex flex-col items-center justify-center py-6 text-center">
      {status === "idle" && (
        <>
          <div className="w-16 h-16 rounded-full bg-brand-50 flex items-center justify-center mb-4 border border-brand-100">
            <HiOutlineMicrophone size={28} className="text-brand-600" />
          </div>
          <h5 className="text-sm font-semibold text-slate-800">Voice Recognition Mode</h5>
          <p className="text-xs text-slate-400 mt-1 mb-6 max-w-xs leading-relaxed">
            Record interaction details in real time. Our AI assistant will automatically transcribe and structure the details.
          </p>
          <button
            type="button"
            onClick={handleStart}
            className="w-full bg-brand-600 hover:bg-brand-700 text-white font-medium text-sm py-2.5 rounded-lg transition-colors shadow-sm"
          >
            Start Recording
          </button>
        </>
      )}

      {status === "recording" && (
        <>
          <div className="relative w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4 border border-red-100">
            <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-20 animate-ping"></span>
            <div className="w-4 h-4 rounded-sm bg-red-600"></div>
          </div>
          <h5 className="text-sm font-semibold text-slate-800">Recording Audio</h5>
          <p className="text-lg font-mono font-bold text-red-600 mt-2 mb-6">{formatTime(seconds)}</p>
          <button
            type="button"
            onClick={handleStop}
            className="w-full bg-slate-800 hover:bg-slate-900 text-white font-medium text-sm py-2.5 rounded-lg transition-colors"
          >
            Stop & Summarize
          </button>
        </>
      )}

      {status === "processing" && (
        <>
          <div className="w-16 h-16 rounded-full bg-brand-50 flex items-center justify-center mb-4 border border-brand-100 animate-pulse">
            <HiOutlineSparkles size={28} className="text-brand-600 animate-spin" />
          </div>
          <h5 className="text-sm font-semibold text-slate-800">Aria is Analyzing Audio</h5>
          <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed animate-pulse">
            Transcribing speech, identifying key medical terms, and structuring form data...
          </p>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Materials Modal Content                                            */
/* ------------------------------------------------------------------ */
function MaterialsModalContent({ selectedMaterials, onSave, onClose }) {
  const availableMaterials = [
    "OmniBoost Phase III KOL report",
    "Diabetes Care Patient Brochure",
    "Cardiovascular Risk Assessment Guide",
    "OncoBoost Clinical Trial Data",
    "Neurology Specialty Product Sheet",
  ];

  const [tempSelected, setTempSelected] = useState(selectedMaterials);

  const toggleSelection = (mat) => {
    if (tempSelected.includes(mat)) {
      setTempSelected(tempSelected.filter((m) => m !== mat));
    } else {
      setTempSelected([...tempSelected, mat]);
    }
  };

  const handleSave = () => {
    onSave(tempSelected);
    onClose();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-2">
        {availableMaterials.map((mat) => {
          const isChecked = tempSelected.includes(mat);
          return (
            <label
              key={mat}
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                isChecked
                  ? "bg-brand-50/50 border-brand-300 text-brand-900 font-medium"
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => toggleSelection(mat)}
                className="text-brand-600 rounded border-slate-300 focus:ring-brand-500"
              />
              <span className="text-sm">{mat}</span>
            </label>
          );
        })}
      </div>
      <button
        type="button"
        onClick={handleSave}
        className="w-full mt-2 bg-brand-600 hover:bg-brand-700 text-white font-medium text-sm py-2.5 rounded-lg transition-colors shadow-sm"
      >
        Share Selected Materials
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Samples Modal Content                                              */
/* ------------------------------------------------------------------ */
function SamplesModalContent({ selectedSamples, onSave, onClose }) {
  const availableSamples = [
    "OmniBoost 10mg Tablets",
    "Insulin Pen Starter Kit",
    "CardioProtect 50mg",
    "GlucoTrack Monitor",
  ];

  const [tempSelected, setTempSelected] = useState(() => {
    const map = {};
    selectedSamples.forEach((item) => {
      map[item.name] = item.qty;
    });
    return map;
  });

  const toggleSelection = (name) => {
    if (tempSelected[name] !== undefined) {
      const next = { ...tempSelected };
      delete next[name];
      setTempSelected(next);
    } else {
      setTempSelected({ ...tempSelected, [name]: 1 });
    }
  };

  const updateQty = (name, qty) => {
    const val = Math.max(1, parseInt(qty) || 1);
    setTempSelected({ ...tempSelected, [name]: val });
  };

  const handleSave = () => {
    const list = Object.entries(tempSelected).map(([name, qty]) => ({ name, qty }));
    onSave(list);
    onClose();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-2">
        {availableSamples.map((sample) => {
          const isSelected = tempSelected[sample] !== undefined;
          return (
            <div
              key={sample}
              className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                isSelected
                  ? "bg-brand-50/50 border-brand-300 text-brand-900 font-medium"
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <label className="flex items-center gap-3 cursor-pointer flex-1 py-1">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleSelection(sample)}
                  className="text-brand-600 rounded border-slate-300 focus:ring-brand-500"
                />
                <span className="text-sm">{sample}</span>
              </label>

              {isSelected && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Qty:</span>
                  <input
                    type="number"
                    min="1"
                    value={tempSelected[sample]}
                    onChange={(e) => updateQty(sample, e.target.value)}
                    className="w-16 px-2 py-1 border border-slate-300 rounded text-center text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
      <button
        type="button"
        onClick={handleSave}
        className="w-full mt-2 bg-brand-600 hover:bg-brand-700 text-white font-medium text-sm py-2.5 rounded-lg transition-colors shadow-sm"
      >
        Add Selected Samples
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sentiment Picker                                                    */
/* ------------------------------------------------------------------ */
function SentimentPicker({ value, onChange }) {
  const options = [
    { label: "Positive", emoji: "😊", color: "text-green-600", bg: "bg-green-50 border-green-300 ring-green-200" },
    { label: "Neutral", emoji: "😐", color: "text-amber-500", bg: "bg-amber-50 border-amber-300 ring-amber-200" },
    { label: "Negative", emoji: "😞", color: "text-red-500", bg: "bg-red-50 border-red-300 ring-red-200" },
  ];

  return (
    <div className="flex gap-3">
      {options.map((opt) => {
        const active = value === opt.label;
        return (
          <button
            key={opt.label}
            type="button"
            onClick={() => onChange(opt.label)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition-all ${
              active
                ? `${opt.bg} ring-2 shadow-sm`
                : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
            }`}
          >
            <span className="text-base">{opt.emoji}</span>
            <span className={active ? opt.color : ""}>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Structured Form (Left Column)                                       */
/* ------------------------------------------------------------------ */
function StructuredForm({ autoFillData }) {
  const dispatch = useDispatch();
  const draftForm = useSelector((state) => state.interaction.draftForm);
  const [submitting, setSubmitting] = useState(false);
  const [materials, setMaterials] = useState([]);
  const [samples, setSamples] = useState([]);
  const [activeModal, setActiveModal] = useState(null); // 'voice' | 'materials' | 'samples'

  const [aiSuggestions] = useState([
    "Schedule follow-up meeting in 2 weeks",
    "Send OmniBoost Phase III KOL report",
    "Add Dr. Sharma to advisory board invite list",
  ]);

  const {
    register,
    handleSubmit,
    reset,
    getValues,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: draftForm,
  });

  const sentimentValue = watch("sentiment");

  // Save to Redux on unmount
  useEffect(() => {
    return () => {
      dispatch(updateDraftForm(getValues()));
    };
  }, [dispatch, getValues]);

  // Auto-fill from AI chat
  useEffect(() => {
    if (autoFillData) {
      if (autoFillData._reset) {
        dispatch(clearDraftForm());
        reset({
          doctor_name: "", hospital: "", specialization: "",
          meeting_date: "", meeting_time: "", meeting_type: "IN_PERSON",
          attendees: "", topics_discussed: "", products: "",
          sentiment: "Neutral", outcomes: "", follow_up_actions: "",
          follow_up_date: "", notes: "",
        });
        setMaterials([]);
        setSamples([]);
        return;
      }
      const cv = getValues();
      reset({
        doctor_name: autoFillData.doctor_name || cv.doctor_name || "",
        hospital: autoFillData.hospital || cv.hospital || "",
        specialization: autoFillData.specialization || cv.specialization || "",
        meeting_date: autoFillData.meeting_date ? formatDateOnly(autoFillData.meeting_date) : (cv.meeting_date || ""),
        meeting_time: autoFillData.meeting_date ? formatTimeOnly(autoFillData.meeting_date) : (cv.meeting_time || ""),
        meeting_type: INTERACTION_TYPES.some((t) => t.value === autoFillData.meeting_type) ? autoFillData.meeting_type : (cv.meeting_type || "IN_PERSON"),
        attendees: cv.attendees || "",
        topics_discussed: autoFillData.notes || cv.topics_discussed || "",
        products: (Array.isArray(autoFillData.products) && autoFillData.products.length > 0) ? autoFillData.products.join(", ") : (cv.products || ""),
        sentiment: cv.sentiment || "Neutral",
        outcomes: cv.outcomes || "",
        follow_up_actions: cv.follow_up_actions || "",
        follow_up_date: autoFillData.follow_up_date ? formatDateOnly(autoFillData.follow_up_date) : (cv.follow_up_date || ""),
        notes: cv.notes || "",
      });
    }
  }, [autoFillData, reset, getValues, dispatch]);

  const handleVoiceSummarize = (data) => {
    reset({
      ...getValues(),
      doctor_name: data.doctor_name,
      hospital: data.hospital,
      specialization: data.specialization,
      meeting_date: data.meeting_date,
      meeting_time: data.meeting_time,
      meeting_type: data.meeting_type,
      attendees: data.attendees,
      topics_discussed: data.topics_discussed,
      sentiment: data.sentiment,
      outcomes: data.outcomes,
      follow_up_actions: data.follow_up_actions,
      follow_up_date: data.follow_up_date,
    });
    if (data.materials) setMaterials(data.materials);
    if (data.samples) setSamples(data.samples);
  };

  async function onSubmit(values) {
    setSubmitting(true);
    const meetingDatetime = values.meeting_date && values.meeting_time
      ? new Date(`${values.meeting_date}T${values.meeting_time}`).toISOString()
      : values.meeting_date
        ? new Date(values.meeting_date).toISOString()
        : new Date().toISOString();

    const payload = {
      doctor_name: values.doctor_name,
      hospital: values.hospital || "N/A",
      specialization: values.specialization || null,
      meeting_date: meetingDatetime,
      meeting_type: values.meeting_type,
      products: [
        ...materials,
        ...samples.map((s) => s.name),
        ...(values.products ? values.products.split(",").map((p) => p.trim()).filter(Boolean) : []),
      ],
      notes: [
        values.topics_discussed,
        materials.length > 0 ? `Materials Shared: ${materials.join(", ")}` : "",
        samples.length > 0 ? `Samples Distributed: ${samples.map((s) => `${s.name} (Qty: ${s.qty})`).join(", ")}` : "",
        values.outcomes ? `Outcomes: ${values.outcomes}` : "",
        values.follow_up_actions ? `Follow-up Actions: ${values.follow_up_actions}` : "",
        values.notes,
      ].filter(Boolean).join("\n\n"),
      follow_up_date: values.follow_up_date ? new Date(values.follow_up_date).toISOString() : null,
    };

    const result = await dispatch(addInteraction(payload));
    setSubmitting(false);

    if (addInteraction.fulfilled.match(result)) {
      toast.success("Interaction saved successfully");
      dispatch(clearDraftForm());
      reset({
        doctor_name: "", hospital: "", specialization: "",
        meeting_date: "", meeting_time: "", meeting_type: "IN_PERSON",
        attendees: "", topics_discussed: "", products: "",
        sentiment: "Neutral", outcomes: "", follow_up_actions: "",
        follow_up_date: "", notes: "",
      });
      setMaterials([]);
      setSamples([]);
    } else {
      toast.error(result.payload || "Failed to save interaction");
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* ── Section 2: Interaction Details ── */}
        <section className="bg-white border border-slate-200 rounded-xl shadow-card p-6">
          <SectionHeader
            title="Interaction Details"
            description="This section records the basic information about the HCP meeting. It includes the HCP name, interaction type, date, time, attendees, and discussion topics."
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label="HCP Name"
              placeholder="Search or select HCP..."
              error={errors.doctor_name?.message}
              {...register("doctor_name")}
            />
            <FormInput label="Interaction Type" as="select" {...register("meeting_type")}>
              {INTERACTION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </FormInput>

            <FormInput label="Date" type="date" {...register("meeting_date")} />
            <FormInput label="Time" type="time" {...register("meeting_time")} />

            <div className="md:col-span-2">
              <FormInput
                label="Attendees"
                placeholder="Enter names or search..."
                {...register("attendees")}
              />
            </div>

            <div className="md:col-span-2">
              <FormInput
                label="Topics Discussed"
                as="textarea"
                placeholder="Enter key discussion points..."
                {...register("topics_discussed")}
              />
            </div>

            <div className="md:col-span-2">
              <button
                type="button"
                onClick={() => setActiveModal("voice")}
                className="flex items-center gap-2 text-sm text-slate-500 hover:text-brand-600 border border-slate-200 rounded-lg px-4 py-2.5 hover:border-brand-400 transition-colors bg-white shadow-sm"
              >
                <HiOutlineMicrophone size={16} />
                <HiOutlineSparkles size={14} />
                <span>Summarize from Voice Note (Requires Consent)</span>
              </button>
            </div>
          </div>
        </section>

        {/* ── Section 3: Materials Shared / Samples Distributed ── */}
        <section className="bg-white border border-slate-200 rounded-xl shadow-card p-6">
          <SectionHeader
            title="Materials Shared / Samples Distributed"
            description="This section tracks all materials and product samples shared during the meeting. It ensures accurate documentation of promotional resources provided to the HCP."
          />

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-slate-700">Materials Shared</span>
                <button
                  type="button"
                  onClick={() => setActiveModal("materials")}
                  className="flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-700 border border-brand-200 rounded-lg px-3 py-1.5 hover:bg-brand-50 transition-colors"
                >
                  <HiOutlineSearch size={14} />
                  Search/Add
                </button>
              </div>
              {materials.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No materials added.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {materials.map((m, i) => (
                    <span key={i} className="flex items-center gap-1 text-xs text-slate-600 bg-slate-100 rounded-full px-3 py-1">
                      {m}
                      <button
                        type="button"
                        onClick={() => setMaterials(materials.filter((_, idx) => idx !== i))}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <hr className="border-slate-100" />

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-slate-700">Samples Distributed</span>
                <button
                  type="button"
                  onClick={() => setActiveModal("samples")}
                  className="flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-700 border border-brand-200 rounded-lg px-3 py-1.5 hover:bg-brand-50 transition-colors"
                >
                  <HiOutlinePlus size={14} />
                  Add Sample
                </button>
              </div>
              {samples.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No samples added.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {samples.map((s, i) => (
                    <span key={i} className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-100 rounded-full px-3 py-1">
                      <span>{s.name}</span>
                      <span className="bg-slate-200 text-slate-700 font-bold px-1.5 py-0.5 rounded text-[10px]">
                        Qty: {s.qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => setSamples(samples.filter((_, idx) => idx !== i))}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Hidden products field that maps to the backend */}
            <input type="hidden" {...register("products")} />
          </div>
        </section>

        {/* ── Section 4: Observed/Inferred HCP Sentiment ── */}
        <section className="bg-white border border-slate-200 rounded-xl shadow-card p-6">
          <SectionHeader
            title="Observed/Inferred HCP Sentiment"
            description="This section records the HCP's overall response during the interaction. The sentiment can be marked as Positive, Neutral, or Negative."
          />
          <SentimentPicker value={sentimentValue} onChange={(v) => setValue("sentiment", v)} />
        </section>

        {/* ── Section 5: Outcomes ── */}
        <section className="bg-white border border-slate-200 rounded-xl shadow-card p-6">
          <SectionHeader
            title="Outcomes"
            description="This section summarizes the key decisions, agreements, or conclusions from the meeting. It highlights the important results achieved during the interaction."
          />
          <FormInput
            as="textarea"
            placeholder="Key outcomes or agreements..."
            {...register("outcomes")}
          />
        </section>

        {/* ── Section 6: Follow-up Actions ── */}
        <section className="bg-white border border-slate-200 rounded-xl shadow-card p-6">
          <SectionHeader
            title="Follow-up Actions"
            description="This section lists the next steps after the meeting. It includes pending tasks, reminders, and future activities."
          />
          <FormInput
            as="textarea"
            placeholder="Enter next steps or tasks..."
            {...register("follow_up_actions")}
          />
          <div className="mt-3">
            <FormInput label="Follow-up Date" type="date" {...register("follow_up_date")} />
          </div>
        </section>

        {/* ── Section 7: AI Suggested Follow-ups ── */}
        <section className="bg-white border border-slate-200 rounded-xl shadow-card p-6">
          <SectionHeader
            title="AI Suggested Follow-ups"
            description="This section provides AI-generated recommendations based on the interaction details. It suggests actions such as scheduling meetings or sharing relevant materials."
          />
          <ul className="space-y-2">
            {aiSuggestions.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-brand-700">
                <span className="mt-0.5 text-brand-500">•</span>
                <span className="hover:underline cursor-pointer">{s}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* ── Submit / Reset ── */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg px-6 py-2.5 transition-colors shadow-sm"
          >
            {submitting && <Loader size={16} />}
            Save Interaction
          </button>
          <button
            type="button"
            onClick={() => {
              dispatch(clearDraftForm());
              reset({
                doctor_name: "", hospital: "", specialization: "",
                meeting_date: "", meeting_time: "", meeting_type: "IN_PERSON",
                attendees: "", topics_discussed: "", products: "",
                sentiment: "Neutral", outcomes: "", follow_up_actions: "",
                follow_up_date: "", notes: "",
              });
              setMaterials([]);
              setSamples([]);
            }}
            className="text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg px-6 py-2.5 transition-colors"
          >
            Reset
          </button>
        </div>
      </form>

      {/* ── Modals ── */}
      <Modal
        isOpen={activeModal === "voice"}
        onClose={() => setActiveModal(null)}
        title="Voice Note AI Transcriber"
      >
        <VoiceNoteModalContent
          onSummarize={handleVoiceSummarize}
          onClose={() => setActiveModal(null)}
        />
      </Modal>

      <Modal
        isOpen={activeModal === "materials"}
        onClose={() => setActiveModal(null)}
        title="Share Promotional Materials"
      >
        <MaterialsModalContent
          selectedMaterials={materials}
          onSave={setMaterials}
          onClose={() => setActiveModal(null)}
        />
      </Modal>

      <Modal
        isOpen={activeModal === "samples"}
        onClose={() => setActiveModal(null)}
        title="Distribute Product Samples"
      >
        <SamplesModalContent
          selectedSamples={samples}
          onSave={setSamples}
          onClose={() => setActiveModal(null)}
        />
      </Modal>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* AI Chat (Right Column – Sticky)                                     */
/* ------------------------------------------------------------------ */
function AiChat({ onDataExtracted }) {
  const dispatch = useDispatch();
  const { messages, sessionId, status } = useSelector((state) => state.chat);
  const [input, setInput] = useState("");
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function handleSend(e) {
    e.preventDefault();
    if (!input.trim() || status === "loading") return;
    const message = input.trim();
    setInput("");
    const result = await dispatch(sendMessage({ message, sessionId }));
    if (sendMessage.fulfilled.match(result)) {
      if (result.payload.interaction_id) {
        toast.success("Interaction logged by Aria");
        onDataExtracted({ _reset: true });
      } else if (result.payload.extracted_data) {
        onDataExtracted(result.payload.extracted_data);
      }
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-card flex flex-col h-[600px] sticky top-24">
      {/* Section 8: AI Assistant Header */}
      <div className="px-5 py-3.5 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center">
              <HiOutlineSparkles size={14} className="text-brand-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">AI Assistant</p>
              <p className="text-xs text-slate-400">Log interaction via chat</p>
            </div>
          </div>
          <button
            onClick={() => dispatch(resetChat())}
            className="text-xs font-medium text-slate-500 hover:text-brand-600"
          >
            New conversation
          </button>
        </div>
        <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
          The AI Assistant helps you quickly log interactions using natural language. It can summarize conversations, identify key points, and recommend follow-up actions.
        </p>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-5 text-sm text-slate-500 leading-relaxed">
            Log interaction details here (e.g., "Met Dr. Smith, discussed Product X efficacy, positive sentiment, shared brochure") or ask for help.
          </div>
        )}
        {messages.map((msg, idx) => (
          <ChatBubble key={idx} role={msg.role} content={msg.content} extractedData={msg.extractedData} />
        ))}
        {status === "loading" && (
          <div className="flex items-center gap-2 text-slate-400 text-xs pl-11">
            <Loader size={14} /> Aria is thinking...
          </div>
        )}
      </div>

      <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-slate-200 px-4 py-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Describe interaction..."
          className="flex-1 rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="flex items-center gap-1.5 shrink-0 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2.5 transition-colors"
        >
          <HiOutlineSparkles size={14} />
          Log
        </button>
      </form>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page Component                                                      */
/* ------------------------------------------------------------------ */
export default function LogInteraction() {
  const [autoFillData, setAutoFillData] = useState(null);

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 min-w-0">
        <Navbar title="Log HCP Interaction" />

        <main className="p-6 max-w-7xl mx-auto">
          {/* ── Section 1: Page Header ── */}
          <div className="mb-6">
            <h1 className="text-xl font-bold text-slate-800">Log HCP Interaction</h1>
            <p className="text-sm text-slate-400 mt-1 leading-relaxed max-w-2xl">
              This page is used to record details of every interaction with a Healthcare Professional (HCP). It captures meeting information, discussion points, shared materials, and follow-up actions. The data helps maintain a complete history of HCP engagements.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 items-start">
            <StructuredForm autoFillData={autoFillData} />
            <AiChat onDataExtracted={setAutoFillData} />
          </div>
        </main>
      </div>
    </div>
  );
}
