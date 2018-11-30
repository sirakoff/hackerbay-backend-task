FROM node:alpine

WORKDIR /usr/src/app

COPY . ./

RUN apk add --no-cache --virtual .deps python g++ make && \
    npm set progress=false && \
    npm config set depth 0 && \
    npm install --production && \
    npm cache clean --force && \
    rm -rf /var/cache/apk/* && \
    apk del .deps


EXPOSE 9000
CMD [ "npm", "start" ]
