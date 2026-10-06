FROM node:24-alpine
WORKDIR /app
COPY package*.json ./
COPY services/notification-service/package.json ./services/notification-service/package.json
RUN npm install --workspace @hypergear/notification-service --include-workspace-root
COPY services/notification-service ./services/notification-service
WORKDIR /app/services/notification-service
USER node
CMD ["npm", "start"]
