import React from 'react';

export function Logo({ className = "w-8 h-8", color = "currentColor" }: { className?: string, color?: string }) {
  return (
    <svg 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Sinergia High-End Brand Identity */}
      
      {/* Bloque Superior - Estructura de la S */}
      <path 
        d="M30 30H70V45H45C40 45 35 50 35 55" 
        stroke={color} 
        strokeWidth="8" 
        strokeLinejoin="bevel"
      />
      
      {/* Bloque Inferior - Respuesta Geométrica */}
      <path 
        d="M70 70H30V55H55C60 55 65 50 65 45" 
        stroke={color} 
        strokeWidth="8" 
        strokeLinejoin="bevel"
      />

      {/* Trazos de Acento - Dan detalle de 'Capa' y Profesionalismo */}
      <path 
        d="M38 38H62" 
        stroke={color} 
        strokeWidth="2" 
        className="opacity-40"
      />
      <path 
        d="M62 62H38" 
        stroke={color} 
        strokeWidth="2" 
        className="opacity-40"
      />

      {/* El 'Nexus' - El punto de unión de la sinergia */}
      <rect x="46" y="46" width="8" height="8" fill={color} transform="rotate(45 50 50)" />
      
      {/* Detalles de terminación industrial */}
      <circle cx="70" cy="30" r="2" fill={color} />
      <circle cx="30" cy="70" r="2" fill={color} />
    </svg>
  );
}
