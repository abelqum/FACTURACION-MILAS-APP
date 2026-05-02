import H2 from "./H2";

export default function CentralTitle({ title, description }) {
  return (
    <div className="text-center mb-12">
      <H2>{title}</H2>
      <p className="text-slate-500 mt-4 max-w-2xl m-auto text-lg">
        {description}
      </p>
    </div>
  );
}
