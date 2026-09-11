#!/bin/bash
# Recusa subir sem senha de admin. A checagem mora aqui, e não no compose, porque
# um ${VAR:?} no compose quebraria o `docker compose up` de quem nem usa o Jenkins.
if [ -z "$JENKINS_ADMIN_PASSWORD" ]; then
  echo "Defina JENKINS_ADMIN_PASSWORD no .env antes de subir o Jenkins." >&2
  exit 1
fi

exec /usr/local/bin/jenkins.sh "$@"
