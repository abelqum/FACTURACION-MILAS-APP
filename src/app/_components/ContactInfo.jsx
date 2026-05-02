import H3 from "./H3";
import ContactList from "./ContactList";
export default function ContactInfo() {
  return (
    <div className="w-full lg:w-2/5 bg-slate-800 text-white p-10 flex flex-col justify-between">
      <div>
        <H3 color="text-yellow-500">Información de Contacto</H3>
        <p className="text-slate-300 mb-8 text-sm leading-relaxed">
          Somos expertos en equipamiento industrial. Contáctanos para recibir
          asesoría personalizada.
        </p>

        <ContactList />
      </div>
    </div>
  );
}
