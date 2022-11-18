FROM node:latest

WORKDIR /app

COPY package*.json ./
COPY ./prisma prisma

RUN yarn

COPY . .

EXPOSE 3001

RUN npx prisma generate

CMD [ "yarn", "start" ]
