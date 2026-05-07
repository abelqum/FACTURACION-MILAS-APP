"use client";

import { useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";

export default function LectorQR({ onScanExitoso }) {
  const scannerRef = useRef(null);
  const startedRef = useRef(false);
  const mountedRef = useRef(false);

  useEffect(() => {
    // Evita doble montaje de React StrictMode
    if (mountedRef.current) return;

    mountedRef.current = true;

    let cancelled = false;

    const iniciarScanner = async () => {
      try {
        // Esperar que exista el DOM
        await new Promise((resolve) => setTimeout(resolve, 100));

        if (cancelled) return;

        const element = document.getElementById("lector-qr-container");

        if (!element) return;

        const scanner = new Html5Qrcode("lector-qr-container");

        scannerRef.current = scanner;

        await scanner.start(
          {
            facingMode: "environment",
          },
          {
            fps: 10,
            qrbox: {
              width: 250,
              height: 250,
            },
            aspectRatio: 1,
          },

          // SUCCESS
          async (decodedText) => {
            if (cancelled) return;

            try {
              if (startedRef.current) {
                startedRef.current = false;

                await scanner.stop();

                onScanExitoso(decodedText);
              }
            } catch (err) {
              console.error("Error deteniendo scanner:", err);
            }
          },

          // ERROR CALLBACK
          () => {},
        );

        startedRef.current = true;
      } catch (err) {
        console.error("Error iniciando lector QR:", err);
      }
    };

    iniciarScanner();

    return () => {
      cancelled = true;
      mountedRef.current = false;

      const limpiar = async () => {
        try {
          const scanner = scannerRef.current;

          if (scanner && startedRef.current) {
            startedRef.current = false;

            try {
              await scanner.stop();
            } catch (e) {}

            try {
              await scanner.clear();
            } catch (e) {}
          }

          scannerRef.current = null;

          // APAGADO FORZADO DE CÁMARA
          const videos = document.querySelectorAll("video");

          videos.forEach((video) => {
            try {
              const stream = video.srcObject;

              if (stream) {
                stream.getTracks().forEach((track) => {
                  track.stop();
                });

                video.srcObject = null;
              }
            } catch (e) {}
          });

          // LIMPIAR HTML RESIDUAL
          const container = document.getElementById("lector-qr-container");

          if (container) {
            container.innerHTML = "";
          }
        } catch (err) {
          console.error("Error limpiando scanner:", err);
        }
      };

      limpiar();
    };
  }, [onScanExitoso]);

  return (
    <div className="relative w-full bg-black rounded-2xl overflow-hidden flex items-center justify-center min-h-[300px]">
      {/* VIDEO */}
      <div id="lector-qr-container" className="w-full h-full" />

      {/* OVERLAY */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
        <div className="w-[220px] h-[220px] relative">
          <div className="absolute top-0 left-0 w-7 h-7 border-t-4 border-l-4 border-blue-500 rounded-tl-xl"></div>

          <div className="absolute top-0 right-0 w-7 h-7 border-t-4 border-r-4 border-blue-500 rounded-tr-xl"></div>

          <div className="absolute bottom-0 left-0 w-7 h-7 border-b-4 border-l-4 border-blue-500 rounded-bl-xl"></div>

          <div className="absolute bottom-0 right-0 w-7 h-7 border-b-4 border-r-4 border-blue-500 rounded-br-xl"></div>
        </div>
      </div>

      {/* CSS */}
      <style jsx global>{`
        #lector-qr-container {
          position: relative;
          width: 100%;
          height: 100%;
        }

        #lector-qr-container video {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
          border-radius: 1rem;
        }

        #lector-qr-container img {
          display: none !important;
        }

        #lector-qr-container__scan_region {
          border: none !important;
        }

        #lector-qr-container__dashboard {
          display: none !important;
        }
      `}</style>
    </div>
  );
}
