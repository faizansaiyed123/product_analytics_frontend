FROM node:22-alpine AS build
WORKDIR /app

# This repository is the frontend project root; its SDK distribution is already
# versioned under public/sdk/javascript/dist and Vite copies public/ into dist/.
COPY package*.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
# Publish the documented /sdk/ URLs expected by nginx.conf (not the nested source path).
COPY --from=build /app/dist/sdk/javascript/dist/analytics.min.js /usr/share/nginx/html/sdk/analytics.min.js
COPY --from=build /app/dist/sdk/javascript/dist/analytics.esm.js /usr/share/nginx/html/sdk/analytics.esm.js
EXPOSE 80
