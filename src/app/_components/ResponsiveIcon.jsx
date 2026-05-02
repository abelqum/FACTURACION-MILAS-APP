export default function ResponsiveIcon({ setMenu, menuOpen }) {
  return (
    <button
      className="ml-auto hover:text-yellow-600 hover:bg-slate-200 rounded-full p-1 md:hidden"
      id="hamb"
      onClick={() => setMenu(!menuOpen)}
    >
      {menuOpen == false ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#000000"
          strokeWidth="1"
          strokeLinecap="round"
          strokeLinejoin="round"
          id="iconHamb"
        >
          <path d="M4 6l16 0" />
          <path d="M4 12l16 0" />
          <path d="M4 18l16 0" />
        </svg>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#000000"
          strokeWidth="1"
          strokeLinecap="round"
          strokeLinejoin="round"
          id="iconClose"
        >
          <path d="M18 6l-12 12" />
          <path d="M6 6l12 12" />
        </svg>
      )}
    </button>
  );
}
