# GXST Vibes

App de vídeos curtos estilo feed vertical, criado em React + Vite + Node/Express + SQLite.

## O que já tem na V23

- Frontend React com feed vertical estilo vídeos curtos
- Backend Node/Express com API real
- Servidor principal `server/v13.js`
- Sistema de lives fake dentro do app
- Botão flutuante **Ao Vivo**
- Criação de sala ao vivo
- Lista de salas ativas
- Entrada em sala com contador de espectadores
- Chat da live com atualização automática
- Envio de presentes em moedas na live
- Ranking de salas por espectadores e presentes
- Encerrar live pelo criador ou admin `ghost`
- SEO avançado para páginas públicas `/@usuario`
- Notificações push internas em formato toast
- Chat direto entre usuários
- Comentários em tempo real
- Visualizações reais por vídeo
- Painel de métricas avançadas
- Conversão automática opcional de vídeo com ffmpeg
- Storage real com suporte a Supabase Storage
- Loja de moedas e VIP
- Carteira de criador
- Sistema de denúncia de vídeos
- Feed IA com algoritmo de recomendação

## Lives fake

O botão **Ao Vivo** abre o painel de salas.

Rotas:

- `GET /api/live/rooms`
- `POST /api/live/rooms`
- `GET /api/live/rooms/:id`
- `POST /api/live/rooms/:id/join`
- `POST /api/live/rooms/:id/end`
- `GET /api/live/rooms/:id/chat`
- `POST /api/live/rooms/:id/chat`
- `POST /api/live/rooms/:id/gift`

Tabelas novas:

- `live_rooms`
- `live_chat_messages`
- `live_viewers`

Observação: esta versão cria lives simuladas dentro do app. Não transmite câmera real ainda.

## SEO das páginas públicas

Cada criador tem uma página pública:

```txt
/@usuario
```

Exemplo:

```txt
/@ghost
```

O servidor injeta meta tags no HTML em produção:

- `<title>` dinâmico
- `meta description`
- `link canonical`
- Open Graph
- Twitter Card
- JSON-LD `Person`

Variável recomendada em produção:

```txt
PUBLIC_SITE_URL=https://seudominio.com
```

## Push interno

Eventos cobertos:

- mensagem privada
- comentário
- curtida
- presente
- follow

## Chat direto

Rotas:

- `GET /api/dm/users`
- `GET /api/dm/threads`
- `GET /api/dm/thread/:username`
- `POST /api/dm/thread/:username`
- `POST /api/dm/thread/:username/read`

## Comentários em tempo real

Rotas:

- `GET /api/videos/:id/comments/live`
- `POST /api/videos/:id/comments/live`
- `GET /api/comments/live/summary`

## Visualizações reais

Rotas:

- `POST /api/videos/:id/view`
- `GET /api/videos/:id/views`

## Métricas avançadas

Rotas:

- `GET /api/analytics/creator`
- `GET /api/admin/analytics`

## Conversão de vídeo

A V23 tenta converter vídeos automaticamente com ffmpeg.

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

## Loja / Pagamentos

Rotas:

- `GET /api/shop/products`
- `POST /api/shop/checkout`
- `POST /api/shop/payments/:id/simulate-paid`
- `GET /api/shop/payments`
- `GET /api/admin/payments`

## Storage Supabase

A V23 usa `server/storageProvider.js`.

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
npm run dev        # frontend + backend V13/V23
npm run server     # apenas backend V13/V23
npm run server:v13 # apenas backend V13/V23
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
- Lives fake: tabelas `live_rooms`, `live_chat_messages`, `live_viewers`
- Mensagens privadas: tabela `direct_messages`
- Notificações: tabela `notifications`
- Comentários: tabela `comments`
- Views: tabela `video_views`
- Upload local: `uploads/`
- Upload Supabase: bucket configurado em `SUPABASE_BUCKET`
- Pagamentos: tabela `payments`

Esses arquivos são gerados em tempo de execução e ficam fora do Git.

## Próximas melhorias

- Transmissão real com câmera/WebRTC
- Checkout real de moedas/VIP
- Sistema de assinatura dos criadores
