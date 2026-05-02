import Link from "next/link";

export default function LinkNotes({ href = "#", children }) {
  return (
    <Link
      href={href}
      className="block w-full py-3 text-center border-2 border-slate-200 text-slate-700 font-bold rounded-lg hover:border-yellow-500 hover:text-yellow-600 transition-colors"
    >
      {children}
    </Link>
  );
}
