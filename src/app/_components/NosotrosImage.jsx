import Image from "next/image";

export default function NosotrosImage() {
  return (
    <Image
      src="/img/hero-image-900.webp"
      alt="Equipo MILAS trabajando"
      width={900}
      height={600}
      className="w-full h-auto object-cover hover:scale-105 transition-transform duration-500 rounded-xl"
      sizes="(min-width: 1024px) 50vw, 100vw"
      priority
    />
  );
}
