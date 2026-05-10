import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const SECTORS = [
  'Tecnología y Software',
  'Logística y Transporte',
  'Alimentación y Bebidas',
  'Metalurgia y Siderurgia',
  'Consultoría y Servicios Profesionales',
  'Marketing y Publicidad',
  'Energía y Renovables',
  'Salud y Farmacéutico',
  'Construcción y Obra Civil',
];

export const MOCK_PARTNERS = [
  {
    id: '1',
    name: 'Logística Avanzada SL',
    sector: 'Logística y Transporte',
    match: 98,
    location: 'Madrid, España',
    reputation: 4.9,
    employees: '50-200',
    tags: ['Flota Eléctrica', 'ISO 9001', 'Distribución'],
    verified: true,
    description: 'Líderes en logística y transporte capilar sostenible con hubs urbanos de alta eficiencia.',
    services: [
      { id: '1a', name: 'Distribución Urbana', price: 12, unit: 'envío' },
      { id: '1b', name: 'Almacenamiento Smart', price: 45, unit: 'm3/mes' },
      { id: '1c', name: 'Pack Diario Reparto', price: 80, unit: 'día' }
    ],
    budget: 25000
  },
  {
    id: '2',
    name: 'Suministros Industriales Getafe',
    sector: 'Maquinaria Industrial',
    match: 92,
    location: 'Getafe, Madrid',
    reputation: 4.7,
    employees: '11-50',
    tags: ['Mantenimiento', 'Express'],
    verified: true,
    description: 'Suministro rápido de componentes críticos para líneas de producción automatizadas.',
    services: [
      { id: '2a', name: 'Repuestos Urgentes', price: 150, unit: 'hora' },
      { id: '2b', name: 'Pack Mantenimiento', price: 1200, unit: 'mes' },
      { id: '2c', name: 'Asistencia Jornada', price: 350, unit: 'jornada' }
    ],
    budget: 15000
  },
  {
    id: '3',
    name: 'Panadería Artesana & Distribución',
    sector: 'Alimentación y Bebidas',
    match: 88,
    location: 'Alcalá de Henares, Madrid',
    reputation: 4.8,
    employees: '2-10',
    tags: ['Producto Fresco', 'Hostelería', 'Local'],
    verified: true,
    description: 'Suministro de productos de panadería tradicionales para reventa en comercios locales y hostelería.',
    services: [
      { id: '3a', name: 'Barra de Pan Tradicional', price: 0.65, unit: 'unidad' },
      { id: '3b', name: 'Suministro Dominical Pack', price: 50, unit: 'domingo' },
      { id: '3c', name: 'Cesta Bollería Semanal', price: 120, unit: 'semana' }
    ],
    budget: 2000
  },
];
