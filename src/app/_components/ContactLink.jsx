import Link from "next/link";
import SvgNote from "./SvgNote";

export default function ContactLink({ icons, title, desc, linkTo }) {
  return (
    <div className="flex items-start gap-4">
      <div className="p-3 bg-slate-700 rounded-lg text-yellow-500">
        <SvgNote icon={icons} />
      </div>
      <div>
        <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">
          {title}
        </p>
        <Link
          href={linkTo}
          className="text-lg font-medium hover:text-yellow-400 transition-colors"
        >
          {desc}
        </Link>
      </div>
    </div>
  );
}
