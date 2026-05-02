"use client";
import { motion } from "framer-motion";

export default function ScrollReveal({
  children,
  delay = 0,
  direction = "up",
}) {
  // Definimos desde dónde va a aparecer el elemento
  const directions = {
    up: { y: 40, x: 0 },
    down: { y: -40, x: 0 },
    left: { x: 40, y: 0 },
    right: { x: -40, y: 0 },
    none: { x: 0, y: 0 }, // Solo fade in sin movimiento
  };

  return (
    <motion.div
      initial={{ opacity: 0, ...directions[direction] }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, margin: "-50px" }} // once: true hace que solo se anime la primera vez que lo ves
      transition={{
        duration: 0.7,
        delay: delay,
        ease: "easeOut",
      }}
    >
      {children}
    </motion.div>
  );
}
