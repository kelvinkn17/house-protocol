FROM golang:1.25-alpine AS builder

WORKDIR /build
ENV CGO_ENABLED=1

RUN apk add --no-cache gcc musl-dev sqlite-dev

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN go build -o ./bin/clearnode .

FROM alpine:3.23.3

RUN addgroup -g 1001 -S clearnode
RUN adduser -S clearnode -u 1001 -G clearnode

COPY --from=builder /build/bin /bin

# Bake in config files for Dokploy deployment
COPY config/compose/sepolia /config

USER clearnode

EXPOSE 8000 4242

CMD ["clearnode"]
