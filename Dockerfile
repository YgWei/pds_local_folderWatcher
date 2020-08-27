FROM node:11.8.0-alpine AS builder
WORKDIR /home/node/app
COPY package.json package-lock.json ./
RUN apk add --no-cache pdftk
RUN npm install
COPY . .
RUN npm run build

###############################################################################

FROM node:11.8.0-alpine
WORKDIR /home/node/app
ENV NODE_ENV production

COPY package.json package-lock.json ./

RUN apk add --no-cache pdftk

RUN npm install \
    && npm cache clean --force

COPY --from=builder /home/node/app/dist ./dist
COPY config/watch.json config/
COPY .env ./
RUN mkdir -p backgroundPdf pdfSource input inputError inputProcessed imposition transform print printError printProcessed impositionPs

CMD npm run start