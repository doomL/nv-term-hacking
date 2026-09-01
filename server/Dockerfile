FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
COPY shared/package.json ./shared/
COPY server/package.json ./server/
COPY client/package.json ./client/

RUN npm install --workspace=shared --workspace=server --workspace=client 2>/dev/null || npm install

COPY shared/ ./shared/
COPY server/ ./server/
COPY client/ ./client/

RUN npm run build -w shared && npm run build -w client && npm run build -w server

FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json* ./
COPY shared/package.json ./shared/
COPY server/package.json ./server/

RUN npm install --workspace=shared --workspace=server --omit=dev 2>/dev/null || npm install --omit=dev

COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/client/dist ./client/dist

WORKDIR /app/server

EXPOSE 3001

CMD ["node", "dist/index.js"]
