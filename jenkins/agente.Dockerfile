# Contêiner onde as etapas do Jenkinsfile rodam: Node 22, como no CI do GitHub,
# mais o Chromium da medição de 320 px e o curl que espera o servidor subir.
FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends chromium curl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
