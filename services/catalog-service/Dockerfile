FROM node:24-alpine
WORKDIR /app
COPY package*.json ./
COPY services/catalog-service/package.json ./services/catalog-service/package.json
RUN npm install --workspace @hypergear/catalog-service --include-workspace-root
COPY services/catalog-service ./services/catalog-service
WORKDIR /app/services/catalog-service
EXPOSE 3002
USER node
CMD ["npm", "start"]
