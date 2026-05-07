const fs = require("fs");

function generarConsultas() {
  console.log("Leyendo Libro1.csv...");

  // Leemos el archivo CSV
  const csvData = fs.readFileSync("Libro1.csv", "utf8");
  const lineas = csvData.split("\n");

  // 1. Borrar base actual y adaptar tipos de datos
  let sql = `-- 1. BORRAMOS LOS REGISTROS ACTUALES PARA EVITAR DUPLICADOS\n`;
  sql += `TRUNCATE TABLE inventario RESTART IDENTITY;\n\n`;

  sql += `-- 2. ASEGURAMOS QUE LA CANTIDAD ACEPTE DECIMALES\n`;
  sql += `ALTER TABLE inventario ALTER COLUMN cantidad TYPE NUMERIC(10,2);\n\n`;

  // 2. Consulta de inserción masiva
  sql += `-- 3. INSERTAMOS TODO EL INVENTARIO LIMPIO\n`;
  sql += `INSERT INTO inventario (modelo, descripcion, medida, id_udm, id_marca, id_almacen, fila, id_condicion, stock_minimo, cantidad, precio_unitario)\n`;
  sql += `SELECT \n`;
  sql += `  v.modelo, v.descripcion, v.medida,\n`;
  sql += `  (SELECT id FROM inventario_udm WHERE nombre = v.udm LIMIT 1),\n`;
  sql += `  (SELECT id FROM inventario_marcas WHERE nombre = v.marca LIMIT 1),\n`;
  sql += `  (SELECT id FROM inventario_almacenes WHERE nombre = v.almacen LIMIT 1),\n`;
  sql += `  v.fila,\n`;
  sql += `  (SELECT id FROM inventario_condiciones WHERE nombre = v.condicion LIMIT 1),\n`;
  sql += `  v.stock_min::INTEGER,\n`;
  sql += `  v.cantidad::NUMERIC(10,2),\n`;
  sql += `  v.precio::NUMERIC(10,2)\n`;
  sql += `FROM (VALUES\n`;

  const valores = [];

  // Saltamos la línea 0 porque es el encabezado del Excel
  for (let i = 1; i < lineas.length; i++) {
    const linea = lineas[i].trim();
    if (!linea) continue;

    // Separamos por punto y coma (;)
    const col = linea.split(";");

    // 🟢 REGLA 1: Si no hay modelo, ponemos guion "-"
    let modelo = col[0]?.trim();
    if (!modelo) modelo = "-";

    let desc = col[1]?.trim();
    if (!desc) continue; // Si no hay descripción, saltamos la fila

    // Limpiamos comillas simples para no romper el SQL
    desc = desc.replace(/'/g, "''");
    let medida = col[2]?.trim().replace(/'/g, "''");

    let udm = col[3]?.trim();
    let marca = col[4]?.trim();
    let almacen = col[5]?.trim();
    let fila = col[6]?.trim();
    let condicion = col[7]?.trim();
    let stock_min = col[8]?.trim();
    let cantidad = col[9]?.trim();
    let precio = col[10]?.trim();

    // 🟢 REGLA 2: Ignorar las filas separadoras del Excel (ej. "FILTROS", "ESPIGAS")
    // Sabemos que son separadores porque no traen unidad de medida ni cantidad
    if (!cantidad && !udm) continue;

    // 🟢 REGLA 3: Valores por defecto estandarizados
    if (!udm) udm = "Pieza";
    if (udm.toLowerCase() === "metros" || udm.toLowerCase() === "metros ")
      udm = "Metro";
    if (udm.toLowerCase() === "piezas") udm = "Pieza";

    if (!marca) marca = "Genérico";
    if (!almacen) almacen = "SIN ASIGNAR";
    if (!condicion) condicion = "NUEVO";
    if (!stock_min) stock_min = "1";
    if (!cantidad) cantidad = "0";
    if (!precio) precio = "0";

    valores.push(
      `  ('${modelo}', '${desc}', '${medida}', '${udm}', '${marca}', '${almacen}', '${fila}', '${condicion}', '${stock_min}', '${cantidad}', '${precio}')`,
    );
  }

  // Unimos todos los valores separados por comas
  sql += valores.join(",\n");
  sql += `\n) AS v(modelo, descripcion, medida, udm, marca, almacen, fila, condicion, stock_min, cantidad, precio);`;

  // Guardamos el resultado en un archivo SQL
  fs.writeFileSync("consultas_inventario.sql", sql);
  console.log(
    `✅ ¡Misión cumplida! Se limpiaron las filas basura y se generaron ${valores.length} productos reales.`,
  );
  console.log(`📂 Revisa el archivo "consultas_inventario.sql" en tu carpeta.`);
}

generarConsultas();
