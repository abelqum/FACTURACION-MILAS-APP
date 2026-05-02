import HeroDescription from "./HeroDescription";
import HeroImage from "./HeroImage";
export default function Hero() {
  return (
    <section
      id="hero"
      className="lg:flex items-center gap-10 w-[90%] m-auto bg-white shadow-xl"
    >
      <HeroImage />
      <HeroDescription />
    </section>
  );
}
