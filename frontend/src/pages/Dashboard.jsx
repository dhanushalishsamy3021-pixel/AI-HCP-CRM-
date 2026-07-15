import { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { HiOutlineClipboardList, HiOutlineUserGroup, HiOutlineCalendar, HiOutlinePencilAlt } from "react-icons/hi";

import Sidebar from "../components/Sidebar.jsx";
import Navbar from "../components/Navbar.jsx";
import DashboardCard from "../components/DashboardCard.jsx";
import { loadInteractions } from "../redux/interactionSlice.js";

export default function Dashboard() {
  const dispatch = useDispatch();
  const { items, status } = useSelector((state) => state.interaction);

  useEffect(() => {
    dispatch(loadInteractions());
  }, [dispatch]);

  const stats = useMemo(() => {
    const uniqueHcps = new Set(items.map((i) => i.hcp?.id)).size;
    const upcomingFollowups = items.filter(
      (i) => i.follow_up_date && new Date(i.follow_up_date) > new Date()
    ).length;
    const aiLogged = items.filter((i) => i.source === "AI_CHAT").length;
    return { total: items.length, uniqueHcps, upcomingFollowups, aiLogged };
  }, [items]);

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 min-w-0">
        <Navbar title="Dashboard" />

        <main className="p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <DashboardCard label="Total Interactions" value={stats.total} icon={HiOutlineClipboardList} accent="brand" />
            <DashboardCard label="Doctors Visited" value={stats.uniqueHcps} icon={HiOutlineUserGroup} accent="emerald" />
            <DashboardCard label="Upcoming Follow-ups" value={stats.upcomingFollowups} icon={HiOutlineCalendar} accent="amber" />
            <DashboardCard label="Logged via AI Chat" value={stats.aiLogged} icon={HiOutlinePencilAlt} accent="rose" />
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-800">Recent Interactions</h2>
              <Link to="/history" className="text-sm text-brand-600 hover:underline font-medium">
                View all
              </Link>
            </div>

            {status === "loading" && <p className="text-sm text-slate-400">Loading...</p>}
            {status === "succeeded" && items.length === 0 && (
              <p className="text-sm text-slate-400">
                No interactions logged yet.{" "}
                <Link to="/log-interaction" className="text-brand-600 hover:underline">
                  Log your first visit
                </Link>
                .
              </p>
            )}

            <div className="divide-y divide-slate-100">
              {items.slice(0, 5).map((item) => (
                <div key={item.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{item.hcp?.name}</p>
                    <p className="text-xs text-slate-400">{item.hcp?.hospital}</p>
                  </div>
                  <span className="text-xs text-slate-400">
                    {new Date(item.meeting_date).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
