import Image from "next/image";
import Link from "next/link";

export default function Logo() {
  return (
    <Link href="/">
      <Image
        src="/img/logo.webp"
        alt="logo milas"
        width="80"
        height="80"
        className="w-auto h-20  md:h-23 "
      />
    </Link>
  );
}
