# GXST Vibes

App de vídeos curtos estilo feed vertical, criado em React + Vite + Node/Express + SQLite.

## O que já tem na V25

- Frontend React com feed vertical estilo vídeos curtos
- Backend Node/Express com API real
- Servidor principal `server/v13.js`
- Checkout real Mercado Pago Pix para moedas e VIP
- Fallback automático para Pix fake quando não houver token
- QR Code Pix real na Loja
- Código copia-e-cola Pix real
- Link/ticket Pix quando retornado pelo Mercado Pago
- Sincronização de status do pagamento real
- Webhook Mercado Pago para atualizar pagamento aprovado
- Liberação automática de moedas/VIP quando o Pix real for aprovado
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

## Checkout real Mercado Pago Pix

A loja agora tenta usar Mercado Pago Pix quando existe token real no ambiente.

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

Funcionamento:

- cria pagamento com `payment_method_id: pix`
- salva ID externo do Mercado Pago
- salva QR Code Pix e QR Code base64
- usuário pode clicar em **Sincronizar Mercado Pago**
- webhook também sincroniza automaticamente
- quando o status vira aprovado, o app libera moedas ou VIP

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

Como usar:

1. Crie uma sala no botão **Ao Vivo**.
2. Abra o botão **Câmera**.
3. Clique em **Transmitir** na sala.
4. Outro usuário abre **Câmera** e clica em **Assistir**.

Observação: esta é uma versão beta P2P. Pode depender de permissões do navegador, HTTPS e compatibilidade de rede.

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

Tabelas:

- `live_rooms`
- `live_chat_messages`
- `live_viewers`
- `live_webrtc_peers`

## SEO das páginas públicas

Cada criador tem uma página pública:

```txt
/@usuario
```

Exemplo:

```txt
/@ghost
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

A V25 tenta converter vídeos automaticamente com ffmpeg.

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

A V25 usa `server/storageProvider.js`.

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
npm run dev        # frontend + backend V13/V25
npm run server     # apenas backend V13/V25
npm run server:v13 # apenas backend V13/V25
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

- Sistema de assinatura dos criadores
- Melhorias visuais dedicadas para live/câmera
- Painel financeiro detalhado
