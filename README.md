# GXST Vibes

App de vídeos curtos estilo feed vertical, criado em React + Vite + Node/Express + SQLite.

## O que já tem na V26

- Frontend React com feed vertical estilo vídeos curtos
- Backend Node/Express com API real
- Servidor principal `server/v13.js`
- Sistema de assinatura dos criadores
- Botão flutuante **Assinar**
- Planos Fã, Premium e VIP Criador
- Assinatura usando moedas internas
- Renovação por 30 dias
- Repasse automático de 70% das moedas para o criador
- Lista de criadores para assinar
- Minhas assinaturas
- Lista de membros assinantes do criador
- Notificação quando alguém assina o perfil
- Checkout real Mercado Pago Pix para moedas e VIP
- Fallback automático para Pix fake quando não houver token
- Câmera ao vivo WebRTC em modo beta
- Sistema de lives fake dentro do app
- SEO avançado para páginas públicas `/@usuario`
- Notificações push internas em formato toast
- Chat direto entre usuários
- Comentários em tempo real
- Visualizações reais por vídeo
- Painel de métricas avançadas
- Conversão automática opcional de vídeo com ffmpeg
- Storage real com suporte a Supabase Storage
- Carteira de criador
- Sistema de denúncia de vídeos
- Feed IA com algoritmo de recomendação

## Assinaturas dos criadores

O botão **Assinar** abre o Creator Club.

Planos:

- Fã: 50 moedas por 30 dias
- Premium: 150 moedas por 30 dias
- VIP Criador: 300 moedas por 30 dias

Rotas:

- `GET /api/subscriptions/plans`
- `GET /api/subscriptions/creators`
- `GET /api/subscriptions/me`
- `GET /api/subscriptions/members`
- `POST /api/subscriptions/creators/:username/subscribe`
- `POST /api/subscriptions/:id/cancel`

Funcionamento:

- usuário escolhe um plano
- assina um criador usando moedas internas
- o criador recebe 70% das moedas
- assinatura fica ativa por 30 dias
- renovar soma mais 30 dias quando ainda estiver ativa
- criador recebe notificação quando alguém assina

## Checkout real Mercado Pago Pix

A loja tenta usar Mercado Pago Pix quando existe token real no ambiente.

Variáveis recomendadas:

```txt
MERCADO_PAGO_ACCESS_TOKEN=APP_USR-...
PAYMENT_GATEWAY=mercado_pago_pix
MERCADO_PAGO_WEBHOOK_URL=https://seudominio.com/api/shop/mercadopago/webhook
MERCADO_PAGO_DEFAULT_PAYER_EMAIL=comprador@seudominio.com
```

Sem `MERCADO_PAGO_ACCESS_TOKEN`, o app continua usando Pix fake para teste.

Rotas:

- `GET /api/shop/products`
- `POST /api/shop/checkout`
- `POST /api/shop/payments/:id/simulate-paid`
- `POST /api/shop/payments/:id/sync`
- `POST /api/shop/mercadopago/webhook`
- `GET /api/shop/payments`
- `GET /api/admin/payments`

## Câmera ao vivo WebRTC beta

O botão **Câmera** abre o painel de transmissão real em modo beta.

Rotas de sinalização:

- `POST /api/live/rooms/:id/webrtc/viewer`
- `GET /api/live/rooms/:id/webrtc/peers`
- `POST /api/live/webrtc/peers/:id/offer`
- `GET /api/live/webrtc/peers/:id/offer`
- `POST /api/live/webrtc/peers/:id/answer`
- `GET /api/live/webrtc/peers/:id/answer`
- `POST /api/live/webrtc/peers/:id/ice`
- `GET /api/live/webrtc/peers/:id/ice`

## Lives fake

Rotas:

- `GET /api/live/rooms`
- `POST /api/live/rooms`
- `GET /api/live/rooms/:id`
- `POST /api/live/rooms/:id/join`
- `POST /api/live/rooms/:id/end`
- `GET /api/live/rooms/:id/chat`
- `POST /api/live/rooms/:id/chat`
- `POST /api/live/rooms/:id/gift`

## SEO das páginas públicas

Cada criador tem uma página pública:

```txt
/@usuario
```

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
- assinatura

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

A V26 tenta converter vídeos automaticamente com ffmpeg.

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

## Storage Supabase

A V26 usa `server/storageProvider.js`.

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
npm run dev        # frontend + backend V13/V26
npm run server     # apenas backend V13/V26
npm run server:v13 # apenas backend V13/V26
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

## Conta demo / admin

```txt
usuário: ghost
senha: 123456
```

## Onde os dados ficam

- Banco SQLite: `server/data/gxst.sqlite`
- Assinaturas: tabela `creator_subscriptions`
- Pagamentos: tabela `payments`
- Lives: tabelas `live_rooms`, `live_chat_messages`, `live_viewers`, `live_webrtc_peers`
- Mensagens privadas: tabela `direct_messages`
- Notificações: tabela `notifications`
- Comentários: tabela `comments`
- Views: tabela `video_views`
- Upload local: `uploads/`
- Upload Supabase: bucket configurado em `SUPABASE_BUCKET`

Esses arquivos são gerados em tempo de execução e ficam fora do Git.

## Próximas melhorias

- Painel financeiro detalhado
- Melhorias visuais dedicadas para live/câmera
- Área exclusiva para assinantes
