FROM node:24-alpine
WORKDIR /app
COPY package*.json ./
COPY services/auth-service/package.json ./services/auth-service/package.json
RUN npm install --workspace @hypergear/auth-service --include-workspace-root
COPY services/auth-service ./services/auth-service
WORKDIR /app/services/auth-service
EXPOSE 3001
USER node
CMD ["npm", "start"]
