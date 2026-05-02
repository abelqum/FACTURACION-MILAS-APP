import { NAV_LINKS } from "../_constants/navLinks";
import Link from "next/link";

export default function NavFooter() {
  return (
    <div className="flex flex-col md:flex-row gap-4 md:gap-8 font-medium">
      {NAV_LINKS.map((el, id) => (
        <Link
          key={id}
          href={el.url}
          className="hover:text-yellow-500 transition-colors"
        >
          {el.link}
        </Link>
      ))}
    </div>
  );
}
