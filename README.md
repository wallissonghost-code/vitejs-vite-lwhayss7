# GXST Vibes

App de vídeos curtos estilo feed vertical, criado em React + Vite + Node/Express + SQLite.

## O que já tem na V19

- Frontend React com feed vertical estilo vídeos curtos
- Backend Node/Express com API real
- Servidor principal `server/v13.js`
- Comentários em tempo real por polling leve
- Botão flutuante **Comentários**
- Painel live para escolher vídeo e comentar
- Busca incremental por `afterId`
- Envio de comentário sem recarregar o app
- Lista atualizando automaticamente
- Sistema de visualizações reais por vídeo
- Tracker automático de views no frontend
- Views entrando nas métricas e no Feed IA
- Painel de métricas avançadas
- Conversão automática opcional de vídeo com ffmpeg
- Página pública externa dos criadores em `/@usuario`
- Storage real com suporte a Supabase Storage
- Loja de moedas e VIP
- Gateway fake PIX para simular compra
- Carteira de criador
- Sistema de denúncia de vídeos
- Feed IA com algoritmo de recomendação
- Notificações reais com tabela SQLite

## Comentários em tempo real

O botão **Comentários** abre um painel live.

Rotas:

- `GET /api/videos/:id/comments/live`
- `POST /api/videos/:id/comments/live`
- `GET /api/comments/live/summary`

Como funciona:

- o painel busca comentários novos a cada poucos segundos
- usa `afterId` para trazer somente comentários novos
- permite enviar comentário sem recarregar o app
- comentários continuam usando a tabela `comments`
- notificações de comentário seguem funcionando pelo trigger SQLite existente

## Visualizações reais

Rotas:

- `POST /api/videos/:id/view`
- `GET /api/videos/:id/views`

O tracker observa os elementos `<video>` e registra view quando o vídeo aparece ou toca.

## Métricas avançadas

Rotas:

- `GET /api/analytics/creator`
- `GET /api/admin/analytics`

## Conversão de vídeo

A V19 tenta converter vídeos automaticamente com ffmpeg.

Se o ambiente não tiver ffmpeg, o upload continua funcionando com o arquivo original.

Variáveis:

| Variável | Função | Padrão |
|---|---|---|
| `VIDEO_PROCESSING` | Liga/desliga conversão | `auto` |
| `FFMPEG_BIN` | Caminho do ffmpeg | `ffmpeg` |
| `VIDEO_SCALE` | Escala do vídeo | `scale=720:-2` |
| `VIDEO_CRF` | Compressão H.264 | `28` |
| `FFMPEG_PRESET` | Velocidade do encode | `veryfast` |
| `AUDIO_BITRATE` | Bitrate do áudio | `96k` |
| `FFMPEG_TIMEOUT_MS` | Tempo máximo de conversão | `180000` |

Para desligar:

```txt
VIDEO_PROCESSING=off
```

## Página pública externa

Cada criador pode ter uma página externa:

```txt
/@usuario
```

Exemplo:

```txt
/@ghost
```

## Loja / Pagamentos

Rotas:

- `GET /api/shop/products`
- `POST /api/shop/checkout`
- `POST /api/shop/payments/:id/simulate-paid`
- `GET /api/shop/payments`
- `GET /api/admin/payments`

## Storage Supabase

A V19 usa `server/storageProvider.js`.

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

## Rodar no Replit

```bash
npm install
npm run dev
```

## Rodar em produção

```bash
npm run build
npm start
```

## Scripts úteis

```bash
npm run dev        # frontend + backend V13/V19
npm run server     # apenas backend V13/V19
npm run server:v13 # apenas backend V13/V19
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

## Perfil público interno

Formato do link interno:

```txt
#/@usuario
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
- Comentários: tabela `comments`
- Views: tabela `video_views`
- Upload local: `uploads/`
- Upload Supabase: bucket configurado em `SUPABASE_BUCKET`
- Pagamentos: tabela `payments`

Esses arquivos são gerados em tempo de execução e ficam fora do Git.

## Próximas melhorias

- Integração com gateway real
- SEO avançado para páginas públicas
- Chat direto entre usuários
