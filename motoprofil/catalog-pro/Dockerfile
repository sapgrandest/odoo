### Stage 1 — Build Vite
FROM node:20-alpine AS builder
WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci

COPY . .

ARG VITE_PA_USERNAME
ARG VITE_PA_PASSWORD
ARG CSV_PATH=/data/catalogue.csv

RUN npm run build

### Stage 2 — Production
FROM node:20-alpine
WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY server.js ./
COPY src/server ./src/server

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- http://localhost:3000/api/catalog/status || exit 1

CMD ["node", "--max-old-space-size=4096", "server.js"]
