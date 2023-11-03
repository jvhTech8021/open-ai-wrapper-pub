FROM --platform=linux/amd64 node:20.6-alpine

WORKDIR /project

COPY yarn.lock ./
COPY package.json ./

WORKDIR /project/packages/nodejs

COPY packages/nodejs/lib/ lib

WORKDIR /project/packages/nodejs/services/open-ai-wrapper

COPY packages/nodejs/services/open-ai-wrapper/package.json ./

RUN yarn install

COPY packages/nodejs/services/open-ai-wrapper/src/ src/

CMD ["node", "src/index.js"]
