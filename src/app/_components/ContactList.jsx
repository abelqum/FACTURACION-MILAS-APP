import ContactLink from "./ContactLink";
import { links } from "../_constants/contactLinks";

export default function ContactList() {
  return (
    <div className="space-y-6">
      {links.map((el, id) => (
        <ContactLink
          key={id}
          icons={el.icons}
          title={el.title}
          desc={el.desc}
          linkTo={el.href}
        />
      ))}
    </div>
  );
}
