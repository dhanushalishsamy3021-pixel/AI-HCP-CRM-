import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { HiOutlineTrash, HiOutlineSearch, HiOutlineSparkles, HiOutlineDocumentText } from "react-icons/hi";

import Sidebar from "../components/Sidebar.jsx";
import Navbar from "../components/Navbar.jsx";
import Loader from "../components/Loader.jsx";
import { loadInteractions, removeInteraction } from "../redux/interactionSlice.js";

const MEETING_TYPE_STYLES = {
  IN_PERSON: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  VIDEO_CALL: "bg-blue-50 text-blue-700 ring-blue-600/20",
  PHONE_CALL: "bg-amber-50 text-amber-700 ring-amber-600/20",
  CONFERENCE: "bg-violet-50 text-violet-700 ring-violet-600/20",
};

export default function InteractionHistory() {
  const dispatch = useDispatch();
  const { items, status } = useSelector((state) => state.interaction);
  const [query, setQuery] = useState("");

  useEffect(() => {
    dispatch(loadInteractions());
  }, [dispatch]);

  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter(
      (i) =>
        i.hcp?.name?.toLowerCase().includes(q) ||
        i.hcp?.hospital?.toLowerCase().includes(q) ||
        i.products?.some((p) => p.name.toLowerCase().includes(q))
    );
  }, [items, query]);

  async function handleDelete(id) {
    const result = await dispatch(removeInteraction(id));
    if (removeInteraction.fulfilled.match(result)) {
      toast.success("Interaction deleted");
    } else {
      toast.error(result.payload || "Failed to delete interaction");
    }
  }

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 min-w-0">
        <Navbar title="Interaction History" />

        <main className="p-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <div className="relative w-full max-w-xs">
                <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search doctor, hospital, product..."
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                />
              </div>
              <span className="text-xs text-slate-400">{filtered.length} record{filtered.length !== 1 && "s"}</span>
            </div>

            {status === "loading" && (
              <div className="flex items-center justify-center gap-2 py-16 text-slate-400 text-sm">
                <Loader size={16} /> Loading interactions...
              </div>
            )}

            {status === "succeeded" && filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
                <HiOutlineDocumentText size={32} className="text-slate-300" />
                <p className="text-sm text-slate-400">No interactions match your search.</p>
              </div>
            )}

            {filtered.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-5 py-3 font-semibold">Doctor</th>
                      <th className="px-5 py-3 font-semibold">Hospital</th>
                      <th className="px-5 py-3 font-semibold">Date</th>
                      <th className="px-5 py-3 font-semibold">Type</th>
                      <th className="px-5 py-3 font-semibold">Products</th>
                      <th className="px-5 py-3 font-semibold">Source</th>
                      <th className="px-5 py-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-5 py-3.5">
                          <p className="font-medium text-slate-800">{item.hcp?.name}</p>
                          {item.hcp?.specialization && (
                            <p className="text-xs text-slate-400">{item.hcp.specialization}</p>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-slate-600">{item.hcp?.hospital}</td>
                        <td className="px-5 py-3.5 text-slate-600 whitespace-nowrap">
                          {new Date(item.meeting_date).toLocaleDateString(undefined, {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ring-1 ring-inset ${
                              MEETING_TYPE_STYLES[item.meeting_type] || "bg-slate-50 text-slate-700 ring-slate-600/20"
                            }`}
                          >
                            {item.meeting_type?.replace("_", " ")}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-slate-600 max-w-[200px] truncate">
                          {item.products?.map((p) => p.name).join(", ") || "—"}
                        </td>
                        <td className="px-5 py-3.5">
                          {item.source === "AI_CHAT" ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-brand-600">
                              <HiOutlineSparkles size={14} /> AI Chat
                            </span>
                          ) : (
                            <span className="text-xs font-medium text-slate-400">Form</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-2 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                            title="Delete"
                          >
                            <HiOutlineTrash size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
