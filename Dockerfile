FROM alpine:3.15

RUN apk add --no-cache git nodejs npm python3 make && \
    npm install -g yarn

COPY . /src

WORKDIR /src

RUN rm -rf packages/frontend && yarn && yarn build
RUN rm /src/packages/circuits/zksnarkBuild/*.ptau

WORKDIR /src/packages/relay

CMD ["yarn", "start"]
