import { DISTRIBUTORS_LIST } from "../_constants/distributors";
import Image from "next/image";

export default function DistributorLogo() {
  return (
    <>
      {DISTRIBUTORS_LIST.map((el, id) => (
        <div key={id} className="flex items-center justify-center">
          <Image
            src={`/img/logo-${el}.webp`}
            alt={`${el.toUpperCase}`}
            className="h-16 md:h-20 object-contain transition-transform hover:scale-110 duration-300"
            width={100}
            height={70}
          />
          <span className="hidden font-bold text-4xl text-slate-400 font-poppins">
            {el}
          </span>
        </div>
      ))}
    </>
  );
}
