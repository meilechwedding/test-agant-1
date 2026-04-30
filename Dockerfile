FROM node:20-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates curl python3 build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev

COPY . .

RUN mkdir -p /app/data

EXPOSE 8080
CMD ["node", "src/server.js"]
