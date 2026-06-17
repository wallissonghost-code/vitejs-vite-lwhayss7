# Produção / Upload V12

A V12 prepara o GXST Vibes para rodar fora do modo simples do Replit.

## Rodar em desenvolvimento

```bash
npm install
npm run dev
```

## Rodar como produção

```bash
npm run build
npm start
```

O comando `npm start` roda `server/v12.js` com `NODE_ENV=production`.

## Variáveis de ambiente suportadas

| Variável | Função | Padrão |
|---|---|---|
| `PORT` | Porta do backend | `3001` |
| `NODE_ENV` | Modo do servidor | `development` |
| `CORS_ORIGIN` | Domínio permitido no CORS | `*` |
| `TRUST_PROXY` | Ativa proxy reverso quando `true` | `false` |
| `UPLOADS_DIR` | Pasta local dos uploads | `uploads` |
| `MAX_UPLOAD_MB` | Tamanho máximo do vídeo em MB | `200` |
| `PUBLIC_UPLOAD_BASE_URL` | URL pública/CDN para arquivos enviados | vazio |
| `JSON_LIMIT` | Limite do body JSON | `10mb` |

## Upload local

Sem `PUBLIC_UPLOAD_BASE_URL`, os vídeos ficam disponíveis em:

```txt
/uploads/nome-do-video.mp4
```

A V12 salva o arquivo com nome limpo e extensão preservada, evitando uploads sem extensão.

## Upload com URL pública / CDN

Quando `PUBLIC_UPLOAD_BASE_URL` estiver definido, a URL salva no banco vira:

```txt
https://cdn.seudominio.com/uploads/nome-do-video.mp4
```

Isso deixa o app preparado para usar um serviço externo de arquivos depois.

## Checklist de produção

- Configurar domínio do frontend em `CORS_ORIGIN`.
- Usar `NODE_ENV=production`.
- Definir `TRUST_PROXY=true` se rodar atrás de proxy.
- Manter `server/data/gxst.sqlite` persistente.
- Manter `uploads/` persistente ou apontar para storage externo.
- Fazer backup periódico de `server/data/`.
- Fazer backup periódico de `uploads/`.
