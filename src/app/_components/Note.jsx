import SvgNote from "./SvgNote";
import LinkNotes from "./LinkNotes";
import UList from "./UList";
export default function Note({
  icon,
  title = "Title",
  desc = "Description paragaph",
  items,
  link,

  children,
}) {
  return (
    <div className="flex flex-col bg-white rounded-xl shadow-xl overflow-hidden border-t-4 border-yellow-500 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group h-full">
      <div className="p-8 flex flex-col h-full">
        <div className="w-16 h-16 bg-yellow-50 rounded-full flex items-center justify-center mb-6 text-yellow-600 group-hover:bg-yellow-600 group-hover:text-white transition-colors duration-300">
          <SvgNote icon={icon} />
        </div>

        <h3 className="font-poppins font-bold text-2xl text-slate-800 mb-3">
          {title}
        </h3>
        <p className="text-slate-500 mb-6 text-sm leading-relaxed">{desc}</p>

        {items ? <UList items={items} /> : null}

        {link ? (
          <div className="mt-auto">
            <LinkNotes href={link[0]}> {link[1]}</LinkNotes>
          </div>
        ) : null}
      </div>
    </div>
  );
}
