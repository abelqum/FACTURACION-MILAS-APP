import Link from "next/link";

export default function Button({ href = "#", children }) {
  return (
    <Link
      href={href}
      className=" w-[55%] block bg-yellow-600 text-center text-white font-bold  font-poppins
      text-lg  p-5 border rounded-2xl hover:bg-yellow-700 transition-colors duration-200 shadow-lg m-auto md:text-xl  md:p-3 lg:p-5"
    >
      {children}
    </Link>
  );
}
