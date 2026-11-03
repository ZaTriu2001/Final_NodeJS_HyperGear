FROM node:24-alpine
WORKDIR /app
COPY . .
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund
USER node
CMD ["node", "services/catalog-service/src/index.js"]
