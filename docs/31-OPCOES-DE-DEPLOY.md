# Opções de deploy

**Data da pesquisa:** 2026-09-10 · **Escopo:** onde publicar o Beever para a banca (P0.2 do `28-PLANO-PARA-A-BANCA.md`), com prioridade para o que não custa nada

Planos gratuitos mudam sem aviso (a Oracle cortou pela metade o dela em junho de 2026), então os números abaixo valem para a data da pesquisa e precisam ser conferidos na hora de criar a conta. As fontes estão no fim.

## O que o Beever exige de um host

O app é uma imagem Docker de Node 22 que precisa de um MySQL 8 de verdade, porque a migration `008_audit_immutability.sql` cria triggers, e banco "compatível com MySQL" que não aceita trigger quebra a trilha de auditoria. Precisa também de disco persistente para os uploads (DT-85), senão a arte enviada some a cada deploy, e de SMTP de saída para a recuperação de senha. Com o MySQL e o Node na mesma máquina, 1 GB de RAM é o mínimo e 2 GB é o confortável. Por fim, o app precisa ficar ligado: plano que "dorme" quando ninguém acessa demora cerca de um minuto para acordar, e a primeira tela da banca estouraria o teto de 2 s da RNF-01.

Esses cinco pontos eliminam a maior parte das plataformas gratuitas, e é por eles que cada opção foi julgada.

## Máquinas inteiras (VPS), onde o Beever roda como está

Nessas opções o deploy é o mesmo em todas: `docker compose` com app, MySQL e Caddy, que tira e renova o certificado TLS sozinho. Trocar de uma para outra depois não muda uma linha do projeto.

| Opção | Custo | Pede cartão? | Máquina | Pontos de atenção |
|---|---|---|---|---|
| **Oracle Cloud Always Free** | Grátis para sempre | Sim, só para verificação | ARM, 2 OCPU e 12 GB de RAM | O cadastro costuma falhar por falta de capacidade na região. Instância com menos de 10% de CPU e de rede por 7 dias pode ser parada. A imagem precisa ser construída também para `arm64` |
| **DigitalOcean pelo GitHub Student Pack** | US$ 200 de crédito por 1 ano | Não, com o pack | À escolha; a de 2 GB custa bem menos que o crédito | Precisa ser estudante verificado no GitHub Education. As portas de SMTP (25, 465 e 587) vêm bloqueadas; o Brevo aceita a porta 2525 |
| **Hack Club Nest** | Grátis | Não | Contêiner Linux num servidor compartilhado da Hack Club, na Finlândia | Só para estudantes adolescentes. O limite de memória por usuário não é publicado, então o MySQL precisa ser testado lá. Sem garantia de disponibilidade |
| **Google Cloud e2-micro** | Grátis para sempre | Sim | 2 vCPU compartilhadas e 1 GB de RAM, só em três regiões dos EUA | 1 GB é apertado para MySQL 8 e Node juntos; exige swap e ajuste do `innodb_buffer_pool_size` |
| **AWS Free Plan** | US$ 100 a 200 de crédito, por 6 meses | Sim | À escolha, pago com o crédito | Desde julho de 2025 não existe mais o ano grátis: acabados os 6 meses ou o crédito, a conta fecha |
| **Azure for Students** | US$ 100 de crédito | Não | À escolha, pago com o crédito | Só para estudantes com 18 anos ou mais |
| **Hetzner CX23** (pago) | € 5,49 por mês desde junho de 2026 | Sim | 2 vCPU, 4 GB de RAM e 40 GB de disco | É a opção paga mais barata e confiável, para quando nada gratuito servir; o preço subiu três vezes em 2026 |

## Rodar num computador do time e publicar por túnel

Um notebook ou PC do time, ou uma máquina da escola, roda o `docker compose` e um túnel publica o endereço com HTTPS sem abrir porta no roteador. É gratuito, não pede cartão e usa exatamente o ambiente de desenvolvimento, mas o endereço só responde enquanto a máquina estiver ligada. Por isso serve muito bem como plano B no dia da banca e mal como endereço permanente.

| Túnel | Custo | Endereço | Observação |
|---|---|---|---|
| **Tailscale Funnel** | Grátis no plano pessoal | Fixo, no formato `maquina.nome.ts.net`, com HTTPS | Não precisa de domínio próprio |
| **Cloudflare Tunnel** | Grátis | Fixo, com domínio próprio na Cloudflare | Sem domínio, só o "quick tunnel", com endereço aleatório que muda a cada reinício |

## Plataformas prontas (PaaS), e por que não servem

| Plataforma | O que o plano gratuito dá | O que impede |
|---|---|---|
| **Render** | 512 MB, 750 horas por mês | Dorme depois de 15 minutos, não tem disco persistente, não tem MySQL (o Postgres gratuito expira em 30 dias) e bloqueia as portas de SMTP |
| **Koyeb** | Uma instância de 512 MB e 0,1 vCPU | Desliga depois de 1 hora sem acesso e não oferece MySQL |
| **Railway** | US$ 5 de teste por 30 dias, depois US$ 1 por mês | US$ 1 mantém um serviço pequeno, sem sobra para o banco |
| **Fly.io** | Nenhum plano gratuito desde 2024 | O teste dura 2 horas de máquina ou 7 dias |
| **Heroku pelo Student Pack** | US$ 13 por mês durante 24 meses | O crédito não cobre add-ons de terceiros, que é onde o MySQL está, e o disco é apagado a cada reinício |
| **Northflank** | Dois serviços e um banco gratuito, que pode ser MySQL | É a única PaaS que chega perto. Os limites do banco gratuito não são publicados e o disco para uploads precisaria ser testado |
| **Cloud Run, App Service, Vercel** | Execuções gratuitas por mês | São feitos para apps sem estado: sem MySQL e sem disco, com arranque a frio |

## Banco gerenciado gratuito, se o app ficar separado do banco

Só faz sentido se o app for para uma PaaS. Em qualquer banco gerenciado, a migration 008 precisa ser testada antes, porque criar trigger com log binário ligado pode exigir uma permissão que o serviço não dá.

| Serviço | Plano gratuito | Observação |
|---|---|---|
| **Oracle HeatWave Always Free** | MySQL de verdade, 50 GB de dados e 50 GB de backup | Vem junto da conta Oracle, então faz par com a VM da Oracle |
| **Aiven for MySQL** | 1 GB de RAM e 1 GB de disco | Desliga depois de um tempo sem uso, com aviso por e-mail |
| **TiDB Cloud Starter** | 5 GB | **Não serve:** o TiDB não aceita trigger, e a 008 falharia |

## Domínio e e-mail gratuitos

Para o domínio, o GitHub Student Pack dá um `.me` por um ano na Namecheap, e o Nest e o Tailscale já entregam um subdomínio próprio (`hackclub.app` e `ts.net`). Sem nenhum desses, o DuckDNS dá um subdomínio grátis que o Caddy consegue certificar. Para o e-mail, o Brevo envia 300 mensagens por dia de graça, sem cartão, o que sobra para a recuperação de senha, e aceita as portas 587, 465 e 2525.

## Recomendação

O caminho gratuito mais forte é a **VM da Oracle**, por ser grátis para sempre e ter memória de sobra. O risco dela está no cadastro, que pede cartão e costuma dar falta de capacidade, e na regra que para instância ociosa; se a conta sair, é o destino definitivo. Se alguém do time tiver cadastro de estudante no GitHub, a **DigitalOcean pelo Student Pack** é a mais simples de operar e não tem nenhum desses riscos durante o ano do TCC. O **Nest** é a saída sem cartão para quem é adolescente, desde que o MySQL caiba no contêiner. Em qualquer um dos três, vale deixar o **computador do time com Tailscale Funnel** pronto como plano B para o dia da banca, porque não depende de conta nenhuma dar certo.

As PaaS gratuitas foram descartadas porque todas esbarram em pelo menos um dos cinco requisitos do começo, e adaptar o Beever a elas custaria mais que subir uma VM.

## Fontes

Oracle: [FAQ do Free Tier](https://www.oracle.com/cloud/free/faq/), [corte do Ampere em 2026 (InfoQ)](https://www.infoq.com/news/2026/07/oracle-cloud-free-tier-limits/), [HeatWave Always Free](https://blogs.oracle.com/mysql/introducing-heatwave-always-free). Google: [Compute Engine gratuito](https://cloud.google.com/free/docs/compute-getting-started). AWS: [novo Free Plan](https://aws.amazon.com/about-aws/whats-new/2025/07/aws-free-tier-credits-month-free-plan/). GitHub Student Pack: [guia 2026](https://perkstack.co/blog/github-student-pack-guide), [oferta do Heroku](https://www.heroku.com/github-students/). DigitalOcean: [bloqueio de SMTP](https://docs.digitalocean.com/support/why-is-smtp-blocked/). Hack Club Nest: [site](https://hackclub.app/), [guia](https://guides.hackclub.app/index.php/Quickstart). Render: [plano gratuito](https://render.com/docs/free). Koyeb: [preços](https://www.koyeb.com/docs/faqs/pricing). Railway: [plano gratuito](https://www.srvrlss.io/provider/railway/). Fly.io: [fim do plano gratuito](https://www.saaspricepulse.com/tools/flyio). Northflank: [sandbox](https://freetier.co/directory/products/northflank). Aiven: [MySQL gratuito](https://aiven.io/docs/products/mysql/concepts/mysql-free-tier). TiDB: [compatibilidade com MySQL](https://docs.pingcap.com/tidb/stable/mysql-compatibility/). Tailscale: [Funnel](https://tailscale.com/docs/reference/examples/funnel). Cloudflare: [Tunnel em 2026](https://recca0120.github.io/en/2026/04/14/cloudflare-tunnel-2026/). Brevo: [SMTP gratuito](https://www.brevo.com/free-smtp-server/). Hetzner: [reajustes de 2026](https://www.bitdoze.com/hetzner-cloud-cost-optimized-plans/).
