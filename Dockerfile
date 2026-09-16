# ─────────────────────────────────────────────────────────────────────────────
# AndesStay — frontend Angular servido por nginx
#
# Etapa 1: compila la SPA con el builder "application" de Angular 17.
# Etapa 2: la sirve con nginx, que además hace de reverse proxy hacia el BFF.
#
# La configuración de nginx NO se copia aquí: se monta desde
# infra/deploy/nginx/, de modo que ajustarla no obliga a reconstruir la imagen.
# ─────────────────────────────────────────────────────────────────────────────

# Angular CLI 17 declara soporte para Node 18 y 20. Con Node 22 o 24 el build
# emite avisos y puede fallar, así que la versión se fija aquí y no se hereda
# de la máquina de quien construye.
FROM node:20-alpine AS build

WORKDIR /app

# Las dependencias se copian primero para que la capa de npm ci se reutilice
# mientras package-lock.json no cambie.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# defaultConfiguration de angular.json ya es "production", pero se deja
# explícito para que el comando diga lo que hace.
RUN npm run build:prod


FROM nginx:1.27-alpine

# La imagen trae un server block de ejemplo que también escucha en el puerto 80
# y entraría en conflicto con el de conf.d/andesstay.conf.
RUN rm -f /etc/nginx/conf.d/default.conf

# El builder "application" deja los estáticos en dist/<proyecto>/browser
COPY --from=build /app/dist/frontend-andesstay/browser /usr/share/nginx/html

# Genera assets/config.json al arrancar, a partir de las variables de entorno
COPY docker/40-runtime-config.sh /docker-entrypoint.d/40-runtime-config.sh
RUN chmod +x /docker-entrypoint.d/40-runtime-config.sh

EXPOSE 80 443
