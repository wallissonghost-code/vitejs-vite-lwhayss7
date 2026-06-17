# GXST Vibes

App de vídeos curtos estilo feed vertical, criado em React + Vite + Node/Express + SQLite.

## O que já tem na V11

- Frontend React com feed vertical estilo vídeos curtos
- Backend Node/Express com API real
- Banco SQLite real usando `better-sqlite3`
- Login e cadastro com usuário/senha
- Senhas protegidas com `bcryptjs`
- Sessão por token salvo no navegador
- Usuários múltiplos
- Perfil editável por usuário logado
- Página pública de perfil por link `#/@usuario`
- Botão **Meu perfil** para abrir o perfil público do usuário logado
- Compartilhamento de perfil público
- Seguir perfil pela página pública
- Feed IA com algoritmo de recomendação
- Botão flutuante **Feed IA**
- Recomendações por curtidas, salvos, seguindo, hashtags, presentes, comentários e recência
- Explicação do motivo da recomendação em cada vídeo
- Notificações reais com tabela SQLite
- Botão flutuante **Inbox** com contador de não lidas
- Notificações de comentário, curtida, presente e seguidor
- Marcar uma notificação como lida
- Marcar todas como lidas
- Sistema de denúncia de vídeos
- Botão flutuante **Denunciar**
- Tabela SQLite de denúncias
- Painel admin de denúncias para a conta `ghost`
- Admin pode marcar denúncia como revisada
- Admin pode dispensar denúncia
- Admin pode remover vídeo denunciado
- Carteira de criador
- Botão flutuante **Carteira**
- Cálculo de ganhos fake por presentes recebidos
- Saldo disponível, pendente e pago
- Pedido de saque fake com chave PIX
- Tabela SQLite de pedidos de saque
- Admin `ghost` pode aprovar ou recusar saques
- Vídeos vinculados ao criador logado
- Upload permanente de vídeos para a pasta `uploads`
- Tabelas SQLite para usuários, sessões, vídeos, comentários, notificações, denúncias e saques
- API de vídeos, perfil, comentários, seguir, salvar, compartilhar, ranking, carteira, presentes, moderação e monetização
- Painel admin para a conta `ghost`
- Admin vê resumo de usuários, vídeos, comentários e moedas
- Admin lista usuários e vídeos
- Admin adiciona/remove moedas de usuários
- Admin apaga vídeos
- Vídeos com autoplay, legenda, música e hashtags
- Curtir, salvar, comentar, compartilhar e seguir
- Presentes/moedas nos vídeos
- Carteira fake com recarga demonstrativa
- Ranking de criadores por pontuação
- Aba Buscar com filtro por usuário, legenda, música e hashtag
- Publicação usando URL de vídeo `.mp4`
- Publicação com seleção de vídeo local do aparelho

## Carteira de criador

O botão flutuante **Carteira** mostra ganhos simulados com base nos presentes recebidos nos vídeos.

A carteira mostra:

- saldo disponível
- ganhos totais
- saques pendentes
- saques pagos
- presentes recebidos
- quantidade de vídeos

O criador pode solicitar saque fake informando valor e chave PIX.

A conta admin `ghost` pode aprovar ou recusar pedidos de saque.

Rotas:

- `GET /api/creator/wallet`
- `POST /api/creator/payouts`
- `GET /api/admin/payouts`
- `POST /api/admin/payouts/:id/status`

## Moderação e denúncias

O botão flutuante **Denunciar** permite escolher um vídeo, selecionar o motivo e enviar detalhes opcionais.

A conta admin `ghost` vê a lista de denúncias no mesmo painel e pode:

- marcar como revisada
- dispensar
- remover o vídeo denunciado

Rotas:

- `POST /api/videos/:id/report`
- `GET /api/admin/reports`
- `POST /api/admin/reports/:id/status`

## Feed IA

O botão flutuante **Feed IA** abre recomendações ordenadas por algoritmo.

O score considera:

- engajamento do vídeo
- vídeos recentes
- criadores que o usuário segue
- criadores parecidos com vídeos curtidos/salvos
- hashtags parecidas com interesses do usuário
- presentes recebidos
- penalização para vídeos já curtidos/salvos

Rota:

- `GET /api/feed/recommended`

## Perfil público

Formato do link:

```txt
#/@usuario
```

Exemplo:

```txt
#/@ghost
```

Ao entrar logado, o botão flutuante **Meu perfil** abre seu perfil público. Dentro do perfil dá para compartilhar o link e seguir o usuário.

## Notificações

O botão flutuante **Inbox** mostra o contador de notificações não lidas.

As notificações são geradas quando:

- alguém comenta em um vídeo seu
- alguém curte um vídeo seu
- alguém envia presente em um vídeo seu
- alguém segue seu perfil público

Rotas:

- `GET /api/notifications`
- `POST /api/notifications/:id/read`
- `POST /api/notifications/read-all`

## Conta demo / admin

```txt
usuário: ghost
senha: 123456
```

Entre com essa conta e toque no botão flutuante **Admin** para abrir o painel administrativo.

Também é possível criar novas contas pela tela de cadastro.

## Rodar no Replit

```bash
npm install
npm run dev
```

O comando `npm run dev` sobe duas coisas ao mesmo tempo:

- Vite/React no frontend
- Express API V5/V6/V7/V8/V9/V10/V11 com SQLite no backend, porta `3001`

O Vite já está configurado para encaminhar `/api` e `/uploads` para o backend.

## Scripts úteis

```bash
npm run dev       # frontend + backend SQLite
npm run server    # apenas backend SQLite
npm run client    # apenas frontend
npm run server:json # backend antigo em JSON, caso precise voltar
```

## API principal

### Autenticação

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`

### Monetização

- `GET /api/creator/wallet`
- `POST /api/creator/payouts`
- `GET /api/admin/payouts`
- `POST /api/admin/payouts/:id/status`

### Feed IA

- `GET /api/feed/recommended`

### Perfil público

- `GET /api/public/profile/:user`
- `POST /api/public/profile/:user/follow`

### Notificações

- `GET /api/notifications`
- `POST /api/notifications/:id/read`
- `POST /api/notifications/read-all`

### Moderação

- `POST /api/videos/:id/report`
- `GET /api/admin/reports`
- `POST /api/admin/reports/:id/status`

### App

- `GET /api/health`
- `GET /api/videos`
- `POST /api/videos`
- `GET /api/profile`
- `PUT /api/profile`
- `POST /api/videos/:id/like`
- `POST /api/videos/:id/save`
- `POST /api/videos/:id/follow`
- `POST /api/videos/:id/share`
- `POST /api/videos/:id/comments`
- `POST /api/videos/:id/gift`
- `POST /api/wallet/recharge`
- `GET /api/ranking`

### Admin

- `GET /api/admin/summary`
- `GET /api/admin/users`
- `GET /api/admin/videos`
- `POST /api/admin/users/:id/coins`
- `DELETE /api/admin/videos/:id`

## Onde os dados ficam

- Banco SQLite: `server/data/gxst.sqlite`
- Arquivos auxiliares do SQLite: `server/data/gxst.sqlite-wal` e `server/data/gxst.sqlite-shm`
- Vídeos enviados: `uploads/`

Esses arquivos são gerados em tempo de execução e ficam fora do Git.

## Próximas melhorias

- Gateway real de pagamento
- Upload em nuvem
- Página web externa dos criadores
