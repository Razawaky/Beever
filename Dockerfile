# Estágio de dependências: `npm ci` roda uma vez só, e os estágios seguintes
# copiam daqui. Antes o build e o runtime instalavam cada um por conta, o que
# baixava o mesmo pacote duas vezes e compilava o bcrypt duas vezes.
FROM node:22-slim AS dependencias

WORKDIR /app

# Camada separada do código: só reinstala quando o lock muda.
COPY package.json package-lock.json ./
RUN npm ci

# ---------------------------------------------------------------------------
# Estágio de build: compila o CSS do Tailwind, que precisa das devDependencies.
FROM node:22-slim AS build

WORKDIR /app

COPY --from=dependencias /app/node_modules ./node_modules
COPY package.json ./
# O Tailwind varre `src/views` e `src/public/js` atrás das classes usadas, então
# o `src` inteiro precisa estar aqui, e não só os estilos.
COPY src ./src
RUN npm run css:build

# ---------------------------------------------------------------------------
# Estágio de dependências de produção: a mesma instalação, sem as de
# desenvolvimento. Podar é mais barato que instalar de novo.
FROM dependencias AS dependencias-producao

RUN npm prune --omit=dev && npm cache clean --force

# ---------------------------------------------------------------------------
# Estágio de runtime: imagem enxuta, só com o necessário para servir.
FROM node:22-slim AS runtime

ENV NODE_ENV=production

WORKDIR /app

COPY --from=dependencias-producao /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY --from=build /app/src ./src
COPY migrations ./migrations
COPY scripts ./scripts

# A pasta de uploads precisa existir e pertencer ao usuário `node` antes da
# troca de usuário: `/app` é do root, e o painel administrativo grava
# ilustração aqui. Sem isso o envio de imagem falha só dentro do contêiner.
RUN mkdir -p /app/uploads && chown -R node:node /app/uploads

# Não roda como root.
USER node

EXPOSE 3000

# O `/health` já responde 503 quando o banco não atende, então o healthcheck é
# só uma chamada a ele. A porta vem do ambiente porque o `PORT` é configurável.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

# O contêiner é stateless: sessão e dados vivem no MySQL, então dá para subir
# várias réplicas atrás de um balanceador.
CMD ["node", "src/server.js"]
