import Image from "next/image";

export default function ProductImage({ producto }) {
  return (
    <Image
      src={producto.imagen}
      alt={producto.nombre}
      fill
      sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
      className="object-contain group-hover:scale-110 transition-transform duration-500 p-4"
    />
  );
}
