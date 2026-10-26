FROM node:22-alpine

ENV NODE_ENV=production
ENV PORT=8080
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY index.mjs ./

USER node
EXPOSE 8080
CMD ["node", "index.mjs"]
