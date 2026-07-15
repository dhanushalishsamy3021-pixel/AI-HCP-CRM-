export default function FormInput({ label, error, as = "input", children, className = "", ...props }) {
  const baseClasses =
    "w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-shadow";

  return (
    <div className={className}>
      {label && <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>}

      {as === "textarea" ? (
        <textarea className={`${baseClasses} min-h-[100px] resize-y`} {...props} />
      ) : as === "select" ? (
        <select className={baseClasses} {...props}>
          {children}
        </select>
      ) : (
        <input className={baseClasses} {...props} />
      )}

      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  );
}
