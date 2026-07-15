import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { HiOutlineLogout } from "react-icons/hi";
import toast from "react-hot-toast";

import { logout } from "../redux/authSlice.js";

export default function Navbar({ title }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);

  function handleLogout() {
    dispatch(logout());
    toast.success("Logged out successfully");
    navigate("/login");
  }

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-10">
      <h1 className="text-lg font-semibold text-slate-800">{title}</h1>

      <div className="flex items-center gap-4">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium text-slate-800">{user?.full_name}</p>
          <p className="text-xs text-slate-400">{user?.role}</p>
        </div>
        <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-semibold">
          {user?.full_name?.charAt(0)?.toUpperCase() || "U"}
        </div>
        <button
          onClick={handleLogout}
          className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-red-600 transition-colors"
          title="Logout"
        >
          <HiOutlineLogout size={20} />
        </button>
      </div>
    </header>
  );
}
