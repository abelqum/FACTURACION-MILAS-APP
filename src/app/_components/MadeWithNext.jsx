export default function MadeWithNext() {
  return (
    <div className="w-full pb-10 pt-4 flex flex-col items-center justify-center gap-1 opacity-50 hover:opacity-100 transition-opacity duration-300">
      <p className="text-[10px] md:text-xs text-slate-200 font-medium tracking-wide">
        © {new Date().getFullYear()}{" "}
        <span className="text-slate-200">Abel Mauricio Quiroz Mora</span>
      </p>

      <a
        href="https://nextjs.org/"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1 text-[10px] md:text-xs text-slate-400 hover:text-black transition-colors"
      >
        <span>Built with</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-3.5 h-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 15v-6l7.745 10.65a9 9 0 1 1 2.255 -1.993" />
          <path d="M15 12v-3" />
        </svg>
        <span className="font-bold tracking-tighter">Next.js</span>
      </a>
    </div>
  );
}
