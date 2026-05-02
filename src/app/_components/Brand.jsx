export default function Brand({ producto }) {
  let brandColor = "bg-slate-200 text-slate-600";
  if (producto.marca === "WINTEK")
    brandColor = "bg-red-100 text-red-700 border border-red-200";
  if (producto.marca === "PIUSI")
    brandColor = "bg-blue-100 text-blue-700 border border-blue-200";
  if (producto.marca === "SAMSON")
    brandColor = "bg-green-100 text-green-700 border border-green-200";
  return (
    <span
      className={`absolute top-4 left-4 ${brandColor} px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide z-10`}
    >
      {producto.marca}
    </span>
  );
}
