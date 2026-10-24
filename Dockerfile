# Build context is the repository root (see docker-compose.yml) so the SDK can be bundled and served at /sdk/.
FROM node:22-alpine AS sdk
WORKDIR /sdk
COPY sdk/javascript/package*.json ./
RUN npm ci --no-audit --no-fund || npm install --no-audit --no-fund
COPY sdk/javascript/ ./
RUN npm run build

FROM node:22-alpine AS web
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci --no-audit --no-fund || npm install --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

FROM nginx:1.27-alpine
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=web /app/dist /usr/share/nginx/html
COPY --from=sdk /sdk/dist/analytics.min.js /usr/share/nginx/html/sdk/analytics.min.js
COPY --from=sdk /sdk/dist/analytics.esm.js /usr/share/nginx/html/sdk/analytics.esm.js
EXPOSE 80
