# Dockerfile
FROM node:16

WORKDIR /app

# Copiar archivos de configuración primero
COPY package*.json ./
COPY . .

# Instalar dependencias
RUN npm install

# Copiar el resto del código
COPY . .

# Puerto por defecto para Node.js
EXPOSE 3000

# Comando para iniciar el servidor
CMD ["node", "server.js"]
