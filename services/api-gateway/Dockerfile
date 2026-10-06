FROM node:24-alpine
WORKDIR /app
COPY package*.json ./
COPY services/api-gateway/package.json ./services/api-gateway/package.json
RUN npm install --workspace @hypergear/api-gateway --include-workspace-root
COPY services/api-gateway ./services/api-gateway
WORKDIR /app/services/api-gateway
EXPOSE 3000
USER node
CMD ["npm", "start"]
