FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm i

COPY src ./src
COPY public ./public
COPY tsconfig.json ./tsconfig.json
COPY next-env.d.ts ./next-env.d.ts
COPY *.config.js ./

CMD npm run dev

