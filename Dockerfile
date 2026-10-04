# RecovAI — image applicative (lot P1.8)
# Build : npm run build produit dist/ (client) + dist/server.cjs (serveur bundlé).
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine AS runtime
RUN addgroup -S recovai && adduser -S recovai -G recovai
WORKDIR /app
ENV NODE_ENV=production PORT=3000
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json
# Le store JSON de démo n'a rien à faire en conteneur : la persistance visée est Postgres.
RUN mkdir -p /app/data && chown -R recovai:recovai /app
USER recovai
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
CMD ["node", "dist/server.cjs"]
