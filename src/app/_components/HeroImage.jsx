import Image from "next/image";

export default function HeroImage() {
  return (
    <Image
      src="/img/hero-image-1600.webp"
      alt="Taller de tractocamiones con sistema de lubricación MILAS"
      width={1600}
      height={1200}
      className="w-full h-auto object-cover aspect-4/3 lg:aspect-auto lg:w-1/2"
      sizes="(min-width: 1024px) 50vw, 100vw"
      priority
    />
  );
}
