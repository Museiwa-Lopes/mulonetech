# Mulone Tech

Sistema Next.js com painel administrativo, PostgreSQL e upload de imagens.

## Requisitos

- Node.js 20+
- PostgreSQL (Neon/Supabase/Railway ou outro)

## Desenvolvimento local

1. Copiar variaveis:

```bash
cp .env.example .env.local
```

2. Preencher `.env.local` com os valores reais.

3. Instalar dependencias e rodar:

```bash
npm ci
npm run dev
```

4. Inicializar schema/tabelas:

```bash
npm run db:setup
```

## Deploy na Vercel

1. Importar repositório na Vercel.
2. `Application Preset`: `Next.js`.
3. `Root Directory`: pasta do projeto com `package.json` (normalmente `./`).
4. Configurar Environment Variables:

- `DATABASE_URL`
- `DATABASE_SSL=true`
- `ADMIN_SESSION_SECRET`
- `EMAIL_USER` (opcional)
- `EMAIL_PASS` (opcional)
- `NEXT_PUBLIC_SUPABASE_URL` (opcional)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (opcional)
- `SUPABASE_SERVICE_ROLE_KEY` (opcional)
- `SUPABASE_UPLOADS_BUCKET` (opcional, default: `uploads`)

5. Deploy.

### Upload estavel em producao (recomendado)

Para persistir uploads na Vercel, configure Supabase Storage:

1. Crie um bucket publico (ex: `uploads`).
2. Defina na Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_UPLOADS_BUCKET=uploads`

Sem isso, o sistema usa fallback local (`/public/uploads`), que nao e persistente em serverless.

## Pos deploy

Rode uma vez o setup do banco apontando para a base de producao:

```bash
npm run db:setup
```

Depois acesse `/admin/login`.

