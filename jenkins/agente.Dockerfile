# Contêiner onde as etapas do Jenkinsfile rodam: Node 22, como no CI do GitHub,
# mais o Chromium da medição de 320 px, o curl que espera o servidor subir e o
# SonarScanner com um JRE próprio.
#
# O SonarScanner precisa de Java, e o node:22-bookworm-slim não traz. As duas
# coisas entram aqui, com versão fixada, para a análise do SonarQube rodar dentro
# do agente descartável — sem depender de um SonarScanner instalado no
# controlador, e sem voltar para a porta de rede da máquina de desenvolvimento.
FROM node:22-bookworm-slim

ARG SONAR_SCANNER_VERSION=5.0.1.3006
ARG SONAR_SCANNER_SHA256=350dbdb517c10fcb3ce70425db95c415b313cad7296c407d416d88f3d50121f8

# O SonarScanner CLI oficial, na versão que o SonarQube 9.9 LTS espera. O
# pacote já vem com o JRE dele dentro (diretório jre/), então o agente não
# precisa de um OpenJDK instalado à parte: menos um pacote, menos conflito de
# versão, e o Java que roda a análise é exatamente o que a SonarSource testou
# com essa versão do scanner.
RUN apt-get update \
  && apt-get install -y --no-install-recommends chromium curl ca-certificates unzip \
  && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL -o /tmp/sonar.zip \
    "https://binaries.sonarsource.com/Distribution/sonar-scanner-cli/sonar-scanner-cli-${SONAR_SCANNER_VERSION}-linux.zip" \
  && echo "${SONAR_SCANNER_SHA256}  /tmp/sonar.zip" | sha256sum -c - \
  && unzip -q /tmp/sonar.zip -d /opt \
  && ln -s "/opt/sonar-scanner-${SONAR_SCANNER_VERSION}/bin/sonar-scanner" /usr/local/bin/sonar-scanner \
  && rm -f /tmp/sonar.zip