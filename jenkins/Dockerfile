# Jenkins local do Beever: a imagem oficial LTS mais o CLI do Docker e os
# plugins que o Jenkinsfile usa. Configurado inteiro pelo casc.yaml, sem
# assistente de instalação. Sobe com: docker compose --profile jenkins up -d

FROM docker:29-cli AS docker-cli

FROM jenkins/jenkins:2.568.3-lts-jdk21

# O pipeline roda cada etapa num contêiner próprio, usando o Docker do host pelo socket.
COPY --from=docker-cli /usr/local/bin/docker /usr/local/bin/docker
COPY --from=docker-cli /usr/local/libexec/docker/cli-plugins /usr/local/libexec/docker/cli-plugins

RUN jenkins-plugin-cli --plugins \
    configuration-as-code \
    job-dsl \
    workflow-aggregator \
    git \
    docker-workflow \
    pipeline-stage-view

COPY casc.yaml /etc/jenkins/casc.yaml
COPY entrada.sh /usr/local/bin/entrada.sh

ENV CASC_JENKINS_CONFIG=/etc/jenkins/casc.yaml

ENTRYPOINT ["/usr/bin/tini", "--", "/usr/local/bin/entrada.sh"]
