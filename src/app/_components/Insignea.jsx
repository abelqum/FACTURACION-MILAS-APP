import { insigneas } from "../_constants/NosotrosInsignea";

export default function Insignea({ title, desc }) {
  return (
    <div className="bg-slate-800 text-white p-8 rounded-2xl shadow-lg hover:-translate-y-1 transition-transform">
      <span className="block text-4xl font-bold text-yellow-500 font-poppins mb-2">
        {title}
      </span>
      <span className="text-sm uppercase tracking-wide opacity-80 font-semibold">
        {desc}
      </span>
    </div>
  );
}
