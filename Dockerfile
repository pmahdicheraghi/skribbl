FROM node:20-slim AS builder
WORKDIR /app

COPY package.json ./
COPY shared/ ./shared/
COPY client/package.json ./client/
COPY server/package.json ./server/

RUN npm install

COPY client/ ./client/
COPY server/ ./server/

RUN npm run build

FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production

COPY package.json ./
COPY shared/ ./shared/
COPY server/package.json ./server/
RUN npm install --omit=dev

COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/client/dist ./client/dist

EXPOSE 3001
ENV PORT=3001

CMD ["npm", "start"]
