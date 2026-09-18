FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json ./
COPY shared/ ./shared/
COPY client/package*.json ./client/
COPY server/package*.json ./server/

RUN npm --prefix client install
RUN npm --prefix server install

COPY client/ ./client/
COPY server/ ./server/

RUN npm --prefix client run build
RUN npm --prefix server run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY package.json ./
COPY shared/ ./shared/
COPY --from=builder /app/server/package*.json ./server/
RUN npm --prefix server install --omit=dev

COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/client/dist ./client/dist

EXPOSE 3001
ENV PORT=3001

CMD ["npm", "--prefix", "server", "start"]
