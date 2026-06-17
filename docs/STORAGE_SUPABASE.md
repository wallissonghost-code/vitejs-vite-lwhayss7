# Storage real com Supabase — V13

A V13 adiciona suporte real a upload externo usando Supabase Storage.

Sem configuração extra, o app continua usando storage local em `uploads/`.

## Modo local padrão

```bash
npm install
npm run dev
```

Nesse modo, os vídeos ficam em:

```txt
/uploads/nome-do-video.mp4
```

## Ativar Supabase Storage

Configure estas variáveis de ambiente no Replit Secrets ou no servidor:

| Variável | Exemplo | Obrigatória |
|---|---|---|
| `STORAGE_DRIVER` | `supabase` | sim |
| `SUPABASE_URL` | `https://seuprojeto.supabase.co` | sim |
| `SUPABASE_SERVICE_ROLE_KEY` | chave service role | sim |
| `SUPABASE_BUCKET` | `gxst-videos` | sim |
| `SUPABASE_FOLDER` | `videos` | não |
| `MAX_UPLOAD_MB` | `200` | não |

## Criar bucket no Supabase

1. Abra o Supabase.
2. Vá em Storage.
3. Crie um bucket chamado `gxst-videos`.
4. Para teste simples, deixe o bucket público.
5. Configure as variáveis no Replit/servidor.
6. Rode novamente o app.

## Como a URL fica salva no banco

Com Supabase, a URL salva no SQLite fica assim:

```txt
https://seuprojeto.supabase.co/storage/v1/object/public/gxst-videos/videos/nome-do-video.mp4
```

## Usar CDN/domínio próprio

Também pode definir:

```txt
PUBLIC_UPLOAD_BASE_URL=https://cdn.seudominio.com
```

Nesse caso a URL salva usa esse domínio.

## Scripts

```bash
npm run dev        # frontend + servidor V13
npm run server     # servidor V13
npm run server:v13 # servidor V13
npm run server:v12 # servidor V12 backup
```

## Observação

A V13 não adiciona dependências novas. O upload para Supabase é feito com `fetch` nativo do Node e `multer` em memória.
