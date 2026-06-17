# GXST Vibes

App de vídeos curtos estilo feed vertical, criado em React + Vite + Node/Express + SQLite.

## O que já tem na V7

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
- Vídeos vinculados ao criador logado
- Upload permanente de vídeos para a pasta `uploads`
- Tabelas SQLite para usuários, sessões, vídeos e comentários
- API de vídeos, perfil, comentários, seguir, salvar, compartilhar, ranking, carteira e presentes
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
- Aba Inbox com notificações demonstrativas
- Publicação usando URL de vídeo `.mp4`
- Publicação com seleção de vídeo local do aparelho

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
- Express API V5/V6/V7 com SQLite no backend, porta `3001`

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

### Perfil público

- `GET /api/public/profile/:user`
- `POST /api/public/profile/:user/follow`

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

- Feed por algoritmo
- Notificações reais
- Moderação avançada de conteúdo
- Página de denúncia
- Monetização real com gateway de pagamento
