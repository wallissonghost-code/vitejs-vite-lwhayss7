# GXST Vibes

App de vídeos curtos estilo feed vertical, criado em React + Vite + Node/Express + SQLite.

## O que já tem na V13

- Frontend React com feed vertical estilo vídeos curtos
- Backend Node/Express com API real
- Servidor principal atualizado para `server/v13.js`
- Storage real com suporte a Supabase Storage
- Upload local como fallback automático
- Upload com nome limpo e extensão preservada
- Configuração de storage por variáveis de ambiente
- Suporte a `STORAGE_DRIVER=local` ou `STORAGE_DRIVER=supabase`
- Suporte a bucket/folder do Supabase
- Health check com dados de storage em `GET /api/health`
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
- Tabelas SQLite para usuários, sessões, vídeos, comentários, notificações, denúncias e saques
- API de vídeos, perfil, comentários, seguir, salvar, compartilhar, ranking, carteira, presentes, moderação e monetização
- Painel admin para a conta `ghost`
- Vídeos com autoplay, legenda, música e hashtags
- Curtir, salvar, comentar, compartilhar e seguir
- Presentes/moedas nos vídeos
- Ranking de criadores por pontuação
- Aba Buscar com filtro por usuário, legenda, música e hashtag
- Publicação usando URL de vídeo `.mp4`
- Publicação com seleção de vídeo local do aparelho

## Storage Supabase

A V13 usa `server/storageProvider.js`.

Sem configurar nada, o app usa storage local:

```txt
STORAGE_DRIVER=local
```

Para usar Supabase Storage, configure no Replit Secrets ou servidor:

| Variável | Exemplo |
|---|---|
| `STORAGE_DRIVER` | `supabase` |
| `SUPABASE_URL` | `https://seuprojeto.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | chave service role |
| `SUPABASE_BUCKET` | `gxst-videos` |
| `SUPABASE_FOLDER` | `videos` |
| `MAX_UPLOAD_MB` | `200` |
| `PUBLIC_UPLOAD_BASE_URL` | opcional, CDN/domínio próprio |

Documentação completa: `docs/STORAGE_SUPABASE.md`.

## Produção e upload

Variáveis gerais:

| Variável | Função | Padrão |
|---|---|---|
| `PORT` | Porta do backend | `3001` |
| `NODE_ENV` | Modo do servidor | `development` |
| `CORS_ORIGIN` | Domínio permitido no CORS | `*` |
| `TRUST_PROXY` | Ativa proxy reverso quando `true` | `false` |
| `UPLOADS_DIR` | Pasta local dos uploads | `uploads` |
| `MAX_UPLOAD_MB` | Tamanho máximo do vídeo em MB | `200` |
| `PUBLIC_UPLOAD_BASE_URL` | URL pública/CDN dos uploads | vazio |
| `JSON_LIMIT` | Limite do body JSON | `10mb` |

Documentação de produção: `docs/PRODUCAO.md`.

## Rodar no Replit

```bash
npm install
npm run dev
```

O comando `npm run dev` sobe duas coisas ao mesmo tempo:

- Vite/React no frontend
- Express API V13 com SQLite no backend, porta `3001`

## Rodar em produção

```bash
npm run build
npm start
```

## Scripts úteis

```bash
npm run dev        # frontend + backend V13
npm run server     # apenas backend V13
npm run server:v13 # apenas backend V13
npm run server:v12 # backend V12 backup
npm run server:v5  # backend antigo V5 backup
npm run server:json # backend antigo em JSON, caso precise voltar
npm run client     # apenas frontend
```

## Carteira de criador

Rotas:

- `GET /api/creator/wallet`
- `POST /api/creator/payouts`
- `GET /api/admin/payouts`
- `POST /api/admin/payouts/:id/status`

## Moderação e denúncias

Rotas:

- `POST /api/videos/:id/report`
- `GET /api/admin/reports`
- `POST /api/admin/reports/:id/status`

## Feed IA

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

## Notificações

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

### Admin

- `GET /api/admin/summary`
- `GET /api/admin/users`
- `GET /api/admin/videos`
- `POST /api/admin/users/:id/coins`
- `DELETE /api/admin/videos/:id`

## Onde os dados ficam

- Banco SQLite: `server/data/gxst.sqlite`
- Arquivos auxiliares do SQLite: `server/data/gxst.sqlite-wal` e `server/data/gxst.sqlite-shm`
- Upload local: `uploads/`
- Upload Supabase: bucket configurado em `SUPABASE_BUCKET`

Esses arquivos são gerados em tempo de execução e ficam fora do Git.

## Próximas melhorias

- Gateway real de pagamento
- Página web externa dos criadores
- Conversão automática de vídeo para formato leve
