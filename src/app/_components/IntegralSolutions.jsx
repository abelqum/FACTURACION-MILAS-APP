import CentralTitle from "./CentralTitle";
import FinalQuestion from "./FinalQuestion";
import Note from "./Note";
export default function IntegralSolutions() {
  return (
    <>
      {" "}
      <section className="w-[90%] m-auto py-20 mt-3">
        <div className="w-full">
          <CentralTitle
            title="Soluciones Integrales"
            description="En MILAS no solo vendemos equipos. Diseñamos e integramos sistemas completos de lubricación para talleres, plantas y procesos industriales."
          />

          <div className="grid md:grid-cols-2 gap-10">
            <Note
              icon={[
                "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
              ]}
              title="Soluciones Integrales"
              desc="En MILAS no solo vendemos equipos. Diseñamos e integramos sistemas
              completos de lubricación para talleres, plantas y procesos
              industriales."
              items={[
                "Cálculo y diseño de tubería.",
                "Montaje de carretes en estructuras.",
                "Instalación completa de los equipos.",
              ]}
              link={["/servicios", "Ir a servicios"]}
            />

            <Note
              icon={[
                "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z",
                "M15 12a3 3 0 11-6 0 3 3 0 016 0z",
              ]}
              title="Mantenimiento y Reparación"
              desc="Reduce tiempos muertos en tu operación. Diagnosticamos,
                  reparamos y damos mantenimiento a equipos de lubricación en
                  talleres e instalaciones industriales."
              items={[
                "Diagnóstico y reparación de bombas: neumáticas, eléctricas, etc.",
                "Kits de reparación originales.",
                "Mantenimiento preventivo.",
              ]}
              link={["/contacto", "Solicitar servicio"]}
            />
          </div>
        </div>

        <FinalQuestion
          title="¿Listo para optimizar tus sistemas de lubricación?"
          des="Asesórate con expertos en mantenimiento industrial y optimiza tu
          operación."
          buttonTitle="Solicitar Cotización"
        />
      </section>
    </>
  );
}
