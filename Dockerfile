# --- ETAPA 1: Construcción (Build) ---
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar archivos de definición de dependencias
COPY package*.json ./

# Instalar todas las dependencias
RUN npm install

# Copiar el resto del código del proyecto
COPY . .

# Generar el build de producción del frontend (esto crea la carpeta /dist)
RUN npm run build

# --- ETAPA 2: Ejecución (Runtime) ---
FROM node:20-alpine

WORKDIR /app

# Instalamos tsx globalmente para poder ejecutar server.ts directamente
RUN npm install -g tsx

# Copiamos solo lo necesario desde la etapa de construcción
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/server.ts ./
COPY --from=builder /app/tsconfig.json ./

# Si tienes archivos de configuración de Firebase necesarios en el servidor, inclúyelos:
# COPY --from=builder /app/firestore.rules ./

# Exponer el puerto que espera Cloud Run (8080 por defecto)
ENV PORT=8080
EXPOSE 8080

# Comando para iniciar la aplicación
# Usamos tsx para ejecutar el archivo TypeScript del servidor
CMD ["tsx", "server.ts"]
