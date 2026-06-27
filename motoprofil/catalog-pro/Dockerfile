### Stage 1 — Build Vite
FROM node:22-slim AS builder
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY . .

ARG VITE_PA_USERNAME
ARG VITE_PA_PASSWORD
ARG CSV_PATH=/data/catalogue.csv

RUN npm run build

### Stage 2 — Production
FROM node:22-slim
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ wget && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY server.js ./
COPY src/server ./src/server

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=120s \
  CMD wget -qO- http://localhost:3000/api/catalog/status || exit 1

CMD ["node", "server.js"]
