export default function CardTitle({ producto }) {
  return (
    <div className="flex gap-2 mb-1">
      <span className="text-xs text-yellow-600 font-bold uppercase tracking-wider">
        {producto.categoria}
      </span>
      <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">
        • {producto.tipo}
      </span>
    </div>
  );
}
