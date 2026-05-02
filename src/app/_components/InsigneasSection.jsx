import Insignea from "./Insignea";

export default function InsigneaSection({ items }) {
  return (
    <section className="w-[90%] m-auto py-16 mt-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
        {items.map((el, id) => (
          <Insignea key={id} title={el.title} desc={el.desc} />
        ))}
      </div>
    </section>
  );
}
