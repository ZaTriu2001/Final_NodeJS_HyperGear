FROM node:24-alpine AS build
WORKDIR /app
COPY . .
RUN npm ci --ignore-scripts --no-audit --no-fund && npm run build --workspace @hypergear/web
FROM nginx:1.27-alpine
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80

