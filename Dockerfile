# Estágio de build: instala tudo (inclusive devDependencies) e compila o CSS.
FROM node:22-slim AS build

WORKDIR /app

# Camada de dependências separada do código: só reinstala quando o lock muda.
COPY package.json package-lock.json ./
RUN npm ci

COPY src ./src
RUN npm run css:build

# ---------------------------------------------------------------------------
# Estágio de runtime: imagem enxuta, só com o necessário para servir.
FROM node:22-slim AS runtime

ENV NODE_ENV=production

WORKDIR /app

# bcrypt tem binding nativo; o slim já traz o necessário para rodá-lo.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/src ./src
COPY migrations ./migrations
COPY scripts ./scripts

# Não roda como root.
USER node

EXPOSE 3000

# O contêiner é stateless: sessão e dados vivem no MySQL, então dá para subir
# várias réplicas atrás de um balanceador.
CMD ["node", "src/server.js"]
