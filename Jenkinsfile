// Portão local do Beever, espelho do .github/workflows/ci.yml. Roda no Jenkins
// do docker-compose (perfil jenkins), e cada etapa roda num contêiner descartável
// do agente, com um MySQL próprio quando precisa de banco.

def agente

// Sobe um MySQL novo, espera ele aceitar conexão e roda os comandos no agente ligado a ele.
// O agente vem por parâmetro: função do Jenkinsfile não enxerga o `def agente` de fora.
def comMysql(agente, String banco, String comandos) {
  docker.image('mysql:8.4').withRun("-e MYSQL_ROOT_PASSWORD=root -e MYSQL_DATABASE=${banco}") { mysql ->
    sh "until docker exec ${mysql.id} mysqladmin ping -h 127.0.0.1 -uroot -proot --silent; do sleep 2; done"
    agente.inside("--link ${mysql.id}:mysql -e DB_NAME=${banco}") {
      sh comandos
    }
  }
}

pipeline {
  agent any

  options {
    timeout(time: 60, unit: 'MINUTES')
    disableConcurrentBuilds()
    buildDiscarder(logRotator(numToKeepStr: '20'))
  }

  environment {
    DB_HOST = 'mysql'
    DB_PORT = '3306'
    DB_USER = 'root'
    DB_PASSWORD = 'root'
    DB_ROOT_PASSWORD = 'root'
    SESSION_SECRET = 'segredo-de-teste-do-ci'
    // O agente roda com o usuário do Jenkins, que não tem HOME gravável lá dentro.
    npm_config_cache = "${WORKSPACE}/.npm"
  }

  stages {
    stage('Dependências') {
      steps {
        script {
          agente = docker.build('beever-ci-agente', '-f jenkins/agente.Dockerfile jenkins')
          agente.inside { sh 'npm ci' }
        }
      }
    }

    stage('Lint e auditoria') {
      steps {
        script {
          agente.inside { sh 'npm run lint && npm run audit' }
        }
      }
    }

    stage('Suíte contra MySQL') {
      environment {
        // A medição de carga cronometra, e máquina compartilhada é lenta demais para servir de portão.
        PULAR_MEDICAO_DE_CARGA = '1'
      }
      steps {
        script {
          comMysql(agente, 'beever_teste', 'npm run test:db')
        }
      }
    }

    stage('Cobertura') {
      steps {
        script {
          comMysql(agente, 'beever_teste', 'npm run test:cobertura')
        }
      }
    }

    // Sem o CSS compilado tudo cabe em 320 px, e a medição provaria nada.
    stage('Rolagem a 320 px') {
      steps {
        script {
          comMysql(agente, 'beever_rolagem', '''
            npm run db:migrate
            npm run db:seed
            npm run css:build
            npm start > servidor.log 2>&1 &
            for tentativa in $(seq 1 60); do
              curl -sf http://127.0.0.1:3000/health > /dev/null && break
              sleep 1
            done
            npm run rolagem
          ''')
        }
      }
    }

    stage('Imagem Docker') {
      steps {
        sh 'docker build --target runtime -t beever:jenkins .'
      }
    }
  }
}
