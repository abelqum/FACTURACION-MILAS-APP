import Button from "./Button";
import H2 from "./H2";

export default function FinalQuestion({ title, des, buttonTitle }) {
  return (
    <section className="py-20">
      <div className="w-[90%] max-w-4xl m-auto text-center bg-yellow-50 border border-yellow-100 p-8 md:p-12 rounded-3xl shadow-sm">
        <H2>{title}</H2>
        <p className="text-slate-600 mb-8 text-lg">{des}</p>
        <Button href="/contacto">{buttonTitle}</Button>
      </div>
    </section>
  );
}
