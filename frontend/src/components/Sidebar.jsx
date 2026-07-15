import { NavLink } from "react-router-dom";
import { HiOutlineViewGrid, HiOutlinePencilAlt, HiOutlineClipboardList, HiOutlineBeaker } from "react-icons/hi";

const links = [
  { to: "/dashboard", label: "Dashboard", icon: HiOutlineViewGrid },
  { to: "/log-interaction", label: "Log Interaction", icon: HiOutlinePencilAlt },
  { to: "/history", label: "Interaction History", icon: HiOutlineClipboardList },
];

export default function Sidebar() {
  return (
    <aside className="hidden md:flex md:flex-col w-64 shrink-0 bg-white border-r border-slate-200 h-screen sticky top-0">
      <div className="flex items-center gap-2 px-6 h-16 border-b border-slate-200">
        <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white">
          <HiOutlineBeaker size={18} />
        </div>
        <span className="font-bold text-slate-800 tracking-tight">HCP CRM</span>
      </div>

      <nav className="flex-1 px-3 py-6 space-y-1">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-brand-50 text-brand-700"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-6 py-4 text-xs text-slate-400 border-t border-slate-200">
        AI-First HCP CRM &copy; {new Date().getFullYear()}
      </div>
    </aside>
  );
}
