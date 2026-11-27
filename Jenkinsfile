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

    // Última etapa de propósito: ela só precisa do código-fonte, e vir no fim
    // faz o Console Output ler na ordem "lint → testes → cobertura → imagem →
    // Sonar". Ver DOCUMENTACAO-PROVADEVOPS.md, seção 3.7.
    stage('Análise SonarQube') {
      steps {
        script {
          // `withSonarQubeEnv` é o que o plugin do SonarQube dá: ele exporta
          // SONAR_HOST_URL e a credencial do Jenkins Credentials para o build,
          // sem o token aparecer nem no Jenkinsfile nem no log. O nome é o da
          // instalação declarada em jenkins/casc.yaml.
          withSonarQubeEnv('beever-sonar') {
            // O scanner roda dentro do mesmo agente descartável das outras
            // etapas, e ele já vem no jenkins/agente.Dockerfile com o JRE
            // junto. Nenhum scanner é instalado no controlador.
            //
            // A `--network` não é enfeite. O agente é um contêiner novo, e
            // contêiner novo nasce na rede `bridge`, onde não existe nenhum
            // serviço do compose. Sem isto, o scanner morre com
            // `UnknownHostException: sonar` mesmo com a URL certa no ambiente.
            // As outras etapas não precisam disto porque o MySQL entra por
            // `--link`, que traz o nome junto; o SonarQube não tem contêiner
            // visível para o Jenkins linkar.
            //
            // `beever_default` é o nome da rede padrão do compose, e ele é
            // fixado pelo `name: beever` lá no topo do docker-compose.yml.
            //
            // O `-Dsonar.login` é o token, e ele vem de `SONAR_AUTH_TOKEN`. O
            // nome da variável é do plugin, e é fácil errar: o plugin exporta
            // `SONAR_AUTH_TOKEN` e não `SONAR_TOKEN`, então confiar no nome
            // errado produz `Not authorized` com a URL, o projeto e a
            // credencial todos perfeitos. O token não é escrito aqui — ele vem
            // do Jenkins Credentials, por trás do `withSonarQubeEnv`, e o `-D`
            // na linha de comando do `sh` não aparece no log.
            agente.inside('--network beever_default') { sh 'sonar-scanner -Dsonar.login=$SONAR_AUTH_TOKEN' }
          }

          // O Quality Gate decide o build. Sem esta espera a etapa terminaria
          // verde só porque a análise foi *publicada*, e não porque a qualidade
          // foi aprovada — seria uma esteira Mentirosa.
          timeout(time: 5, unit: 'MINUTES') {
            waitForQualityGate abort: true
          }
        }
      }
    }
  }
}
