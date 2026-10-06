FROM node:24-alpine
WORKDIR /app
COPY package*.json ./
COPY services/ai-service/package.json ./services/ai-service/package.json
RUN npm install --workspace @hypergear/ai-service --include-workspace-root
COPY services/ai-service ./services/ai-service
WORKDIR /app/services/ai-service
EXPOSE 3005
USER node
CMD ["npm", "start"]
