FROM node:22-bookworm-slim

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json .npmrc ./
RUN npm ci --omit=dev --legacy-peer-deps

COPY . .

EXPOSE 5000

CMD ["npm", "start"]
