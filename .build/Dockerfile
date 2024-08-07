FROM node:20 as builder
WORKDIR /opt/app
RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml ./
RUN pnpm install
COPY . .
RUN pnpm run build

FROM nginx:alpine
WORKDIR /usr/share/nginx/html
RUN apk add --no-cache bash jq curl
COPY --from=builder /opt/app/dist /usr/share/nginx/html
COPY ./.build/nginx/default.conf ./.build/nginx/json-logs.conf /etc/nginx/conf.d/
COPY ./.build/nginx/nginx.conf /etc/nginx/nginx.conf
COPY ./.build/entrypoint.sh /
ENTRYPOINT [ "/entrypoint.sh" ]
CMD ["nginx", "-g", "daemon off;"]