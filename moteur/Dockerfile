FROM node:22-slim
WORKDIR /app

# build tools : better-sqlite3 compile via node-gyp (comme catalog-pro)
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY src ./src

ENV NODE_ENV=production
EXPOSE 3000

# Process long-running auto-planifiant (santé + ingest horaire en enfant frais)
CMD ["node", "src/server.js"]
