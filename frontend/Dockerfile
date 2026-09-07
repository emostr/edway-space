FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .

# Публичные настройки вшиваются в сборку: адрес сайта, почта и реквизиты
# оператора персональных данных попадают в документы и разметку страниц.
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_CONTACT_EMAIL
ARG NEXT_PUBLIC_OPERATOR_NAME
ARG NEXT_PUBLIC_OPERATOR_STATUS
ARG NEXT_PUBLIC_OPERATOR_INN
ARG NEXT_PUBLIC_OPERATOR_ADDRESS
ARG NEXT_PUBLIC_OPERATOR_EMAIL
ARG NEXT_PUBLIC_DOCS_DATE
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3001
ENV HOSTNAME=0.0.0.0
RUN apk add --no-cache tini
# Автономная сборка Next: рядом с ней нужен только node.
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
EXPOSE 3001
ENTRYPOINT ["/sbin/tini", "--", "node", "server.js"]
