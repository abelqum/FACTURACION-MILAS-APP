export default function SliderButton({ direction = "left", setSlide }) {
  {
    /*TRUE: RIGTH  FALSE: LEFT */
  }
  return (
    <button
      className={`absolute ${direction === "right" ? "right-2" : "left-2"} top-1/2 -translate-y-1/2 z-50
       bg-slate-200/80 p-2 rounded-full shadow-md hover:bg-slate-300 transition-all cursor-pointer`}
      onClick={setSlide}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
        className="w-6 h-6"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d={
            direction === "right"
              ? "M8.25 4.5l7.5 7.5-7.5 7.5"
              : "M15.75 19.5L8.25 12l7.5-7.5"
          }
        />
      </svg>
    </button>
  );
}
