FROM node:20-alpine

# python3/make/g++ are required for better-sqlite3 native addon compilation
RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3001

CMD ["node", "src/server.js"]
