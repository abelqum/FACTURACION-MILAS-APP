import SvgTick from "./SvgTick";
export default function UList({ items }) {
  return (
    <ul className="space-y-3 mb-8">
      {items.map((el, id) => (
        <li key={id} className="flex items-start text-slate-600 text-sm">
          <SvgTick />
          {el}
        </li>
      ))}
    </ul>
  );
}
