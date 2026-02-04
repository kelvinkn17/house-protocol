FROM oven/bun:1 AS builder

WORKDIR /app

ARG VITE_CLEARNODE_URL=wss://nitrolite.kwek.dev/ws

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
ENV VITE_CLEARNODE_URL=$VITE_CLEARNODE_URL
RUN bun run build

FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html

# SPA routing support
RUN echo 'server { \
    listen 5200; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 5200

CMD ["nginx", "-g", "daemon off;"]
