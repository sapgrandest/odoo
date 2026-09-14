# node:22-slim = glibc (requis pour les binaires prébuild de better-sqlite3)
FROM node:22-slim

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY src ./src

ENV NODE_ENV=production
EXPOSE 3000

# Process long-running (garde le conteneur vivant pour la Scheduled Task).
# L'ingest est lancé par le cron Coolify : node src/ingest.js
CMD ["node", "src/server.js"]
