# GXST Vibes

App de vídeos curtos estilo feed vertical, criado em React + Vite + Node/Express + SQLite.

## O que já tem na V17

- Frontend React com feed vertical estilo vídeos curtos
- Backend Node/Express com API real
- Servidor principal `server/v13.js`
- Painel de métricas avançadas
- Botão flutuante **Métricas**
- Métricas do criador logado
- Timeline dos últimos 7 dias
- Ranking dos melhores vídeos do criador
- Score de performance por vídeo
- Métricas admin para `ghost`
- Top criadores por performance
- Receita fake de pagamentos pagos
- Contagem de denúncias abertas e saques pendentes
- Conversão automática opcional de vídeo com ffmpeg
- Fallback automático caso ffmpeg não esteja disponível
- Saída MP4 leve para feed vertical
- Página pública externa dos criadores em `/@usuario`
- Vitrine pública com perfil, estatísticas e vídeos
- Storage real com suporte a Supabase Storage
- Upload local como fallback automático
- Loja de moedas e VIP
- Gateway fake PIX para simular compra
- Carteira de criador
- Sistema de denúncia de vídeos
- Feed IA com algoritmo de recomendação
- Notificações reais com tabela SQLite
- Ranking de criadores por pontuação

## Métricas avançadas

O botão **Métricas** mostra o painel de desempenho do criador.

Rotas:

- `GET /api/analytics/creator`
- `GET /api/admin/analytics`

Métricas do criador:

- vídeos publicados
- curtidas
- comentários
- compartilhamentos
- presentes
- score geral
- ganhos estimados
- pagamentos pagos
- melhores vídeos
- atividade dos últimos 7 dias

Métricas admin:

- total de usuários
- total de vídeos
- total de comentários
- curtidas totais
- presentes totais
- pagamentos pagos
- receita fake
- denúncias abertas
- saques pendentes
- top criadores

## Conversão de vídeo

A V17 tenta converter vídeos automaticamente com ffmpeg.

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

Essa página mostra avatar, nome, bio, estatísticas, vídeos, seguir, compartilhar e abrir no app.

## Loja / Pagamentos

Rotas:

- `GET /api/shop/products`
- `POST /api/shop/checkout`
- `POST /api/shop/payments/:id/simulate-paid`
- `GET /api/shop/payments`
- `GET /api/admin/payments`

## Storage Supabase

A V17 usa `server/storageProvider.js`.

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
npm run dev        # frontend + backend V13/V17
npm run server     # apenas backend V13/V17
npm run server:v13 # apenas backend V13/V17
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
- Arquivos auxiliares do SQLite: `server/data/gxst.sqlite-wal` e `server/data/gxst.sqlite-shm`
- Upload local: `uploads/`
- Upload Supabase: bucket configurado em `SUPABASE_BUCKET`
- Pagamentos: tabela `payments`

Esses arquivos são gerados em tempo de execução e ficam fora do Git.

## Próximas melhorias

- Integração com gateway real
- SEO avançado para páginas públicas
- Sistema de visualizações reais por vídeo
