import Button from "./Button";
import H1 from "./H1";
export default function HeroDescription() {
  return (
    <div id="hero-description" className="flex flex-col gap-6 p-4">
      <H1>Soluciones profesionales de lubricación para talleres e industria</H1>
      <Button href="/contacto">Implementa tu nuevo sistema</Button>
    </div>
  );
}
