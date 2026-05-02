import ContactForm from "./ContactForm";
import ContactInfo from "./ContactInfo";

export default function Contact() {
  return (
    <section className="w-[90%] mb-20 max-w-6xl m-auto bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col lg:flex-row">
      <ContactInfo />
      <ContactForm />
    </section>
  );
}
