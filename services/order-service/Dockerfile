FROM node:24-alpine
WORKDIR /app
COPY package*.json ./
COPY services/order-service/package.json ./services/order-service/package.json
RUN npm install --workspace @hypergear/order-service --include-workspace-root
COPY services/order-service ./services/order-service
WORKDIR /app/services/order-service
EXPOSE 3003
USER node
CMD ["npm", "start"]
