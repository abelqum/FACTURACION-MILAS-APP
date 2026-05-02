import { Children } from "react";

export default function H3({ children, color }) {
  return (
    <h3
      className={`font-poppins font-bold text-2xl mb-6 ${color ?? "text-black"}`}
    >
      {children}
    </h3>
  );
}
