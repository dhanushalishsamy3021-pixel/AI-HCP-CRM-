import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { HiOutlineBeaker } from "react-icons/hi";

import { login } from "../redux/authSlice.js";
import FormInput from "../components/FormInput.jsx";
import Loader from "../components/Loader.jsx";

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export default function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { token, status, error } = useSelector((state) => state.auth);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "hcp1@gmail.com",
      password: "password123",
    },
  });

  useEffect(() => {
    if (token) navigate("/dashboard");
  }, [token, navigate]);

  async function onSubmit(values) {
    const result = await dispatch(login(values));
    if (login.fulfilled.match(result)) {
      toast.success("Welcome back!");
      navigate("/dashboard");
    } else {
      toast.error(result.payload || "Login failed");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-brand-600 flex items-center justify-center text-white mb-3">
            <HiOutlineBeaker size={24} />
          </div>
          <h1 className="text-xl font-bold text-slate-800">AI-First HCP CRM</h1>
          <p className="text-sm text-slate-500 mt-1">Sign in to log and manage doctor visits</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="bg-white border border-slate-200 rounded-xl shadow-card p-6 space-y-4">
          <FormInput
            label="Email"
            type="email"
            placeholder="rep@pharma.com"
            error={errors.email?.message}
            {...register("email")}
          />
          <FormInput
            label="Password"
            type="password"
            placeholder="••••••••"
            error={errors.password?.message}
            {...register("password")}
          />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={status === "loading"}
            className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-medium rounded-lg py-2.5 text-sm transition-colors"
          >
            {status === "loading" && <Loader size={16} />}
            Sign In
          </button>
        </form>

        <p className="text-center text-xs text-slate-400 mt-6">
          Use the credentials created via the <code>/api/register</code> endpoint or seeded test account.
        </p>
      </div>
    </div>
  );
}
