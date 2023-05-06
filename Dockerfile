FROM node:19-bullseye-slim as base

RUN mkdir /app
WORKDIR /app

ADD index.js ./
ADD package.json package-lock.json ./
RUN npm install


CMD ["node", "index"]

EXPOSE 3001
