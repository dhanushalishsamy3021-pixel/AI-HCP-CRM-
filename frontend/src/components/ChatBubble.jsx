import { HiOutlineSparkles, HiOutlineUser } from "react-icons/hi";

export default function ChatBubble({ role, content, extractedData }) {
  const isUser = role === "user";

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center ${
          isUser ? "bg-brand-600 text-white" : "bg-slate-800 text-white"
        }`}
      >
        {isUser ? <HiOutlineUser size={16} /> : <HiOutlineSparkles size={16} />}
      </div>

      <div className={`max-w-[75%] ${isUser ? "items-end" : "items-start"} flex flex-col gap-1.5`}>
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
            isUser
              ? "bg-brand-600 text-white rounded-tr-sm"
              : "bg-slate-100 text-slate-800 rounded-tl-sm"
          }`}
        >
          {content}
        </div>

        {extractedData && Object.values(extractedData).some(Boolean) && (
          <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-500 space-y-0.5">
            {extractedData.doctor_name && <p><span className="font-medium text-slate-700">Doctor:</span> {extractedData.doctor_name}</p>}
            {extractedData.hospital && <p><span className="font-medium text-slate-700">Hospital:</span> {extractedData.hospital}</p>}
            {extractedData.products?.length > 0 && <p><span className="font-medium text-slate-700">Products:</span> {extractedData.products.join(", ")}</p>}
            {extractedData.follow_up_date && <p><span className="font-medium text-slate-700">Follow-up:</span> {extractedData.follow_up_date}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
