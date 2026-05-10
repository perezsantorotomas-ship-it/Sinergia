export const INDUSTRIAL_SECTORS = [
  "Alimentación y Bebidas",
  "Agricultura y Pesca",
  "Industrias Químicas",
  "Logística y Transporte",
  "Tecnología y Software",
  "Construcción y Obra Civil",
  "Energía y Renovables",
  "Textil y Moda",
  "Automoción",
  "Metalurgia y Siderurgia",
  "Salud y Farmacéutico",
  "Turismo y Hostelería",
  "Consultoría y Servicios Profesionales",
  "Medio Ambiente y Reciclaje",
  "Madera y Mueble",
  "Artes Gráficas y Papel",
  "Educación y Formación",
  "Retail y Comercio",
  "Marketing y Publicidad",
  "Finanzas y Seguros",
  "Inmobiliario",
  "Telecomunicaciones",
  "Maquinaria Industrial",
  "Electrónica"
] as const;

export type IndustrialSector = typeof INDUSTRIAL_SECTORS[number];
