import DistributorLogo from "./DistributorLogo";

export default function Distributors() {
  return (
    <section className="w-[90%] m-auto mt-10 mb-10 py-12 bg-white shadow-sm rounded-lg">
      <div className="text-center">
        <p className="text-slate-500 font-medium mb-10 uppercase text-sm tracking-widest">
          Distribuidores Oficiales
        </p>

        <div className="flex flex-wrap justify-center items-center gap-16 md:gap-32">
          <DistributorLogo />
        </div>
      </div>
    </section>
  );
}
