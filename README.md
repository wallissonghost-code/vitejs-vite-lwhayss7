# GXST Vibes

App de vídeos curtos estilo feed vertical, criado em React + Vite + Node/Express.

## O que já tem na V4

- Frontend React com feed vertical estilo vídeos curtos
- Backend Node/Express com API real
- Login e cadastro com usuário/senha
- Sessão por token salvo no navegador
- Usuários múltiplos
- Perfil editável por usuário logado
- Vídeos vinculados ao criador logado
- Banco de dados simples em JSON local
- Upload permanente de vídeos para a pasta `uploads`
- API de vídeos, perfil, comentários, seguir, salvar, compartilhar, ranking, carteira e presentes
- Vídeos com autoplay, legenda, música e hashtags
- Curtir, salvar, comentar, compartilhar e seguir
- Presentes/moedas nos vídeos
- Carteira fake com recarga demonstrativa
- Ranking de criadores por pontuação
- Aba Buscar com filtro por usuário, legenda, música e hashtag
- Aba Inbox com notificações demonstrativas
- Publicação usando URL de vídeo `.mp4`
- Publicação com seleção de vídeo local do aparelho

## Conta demo

```txt
usuário: ghost
senha: 123456
```

Também é possível criar novas contas pela tela de cadastro.

## Rodar no Replit

```bash
npm install
npm run dev
```

O comando `npm run dev` sobe duas coisas ao mesmo tempo:

- Vite/React no frontend
- Express API no backend, porta `3001`

O Vite já está configurado para encaminhar `/api` e `/uploads` para o backend.

## API principal

### Autenticação

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`

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

## Onde os dados ficam

- Banco JSON: `server/data/db.json`
- Vídeos enviados: `uploads/`

Esses arquivos são gerados em tempo de execução e ficam fora do Git.

## Próximas melhorias

- Trocar JSON por PostgreSQL ou SQLite
- Recuperação de senha
- Página pública de perfil
- Feed por algoritmo
- Notificações reais
- Moderação de conteúdo
- Monetização real com gateway de pagamento
