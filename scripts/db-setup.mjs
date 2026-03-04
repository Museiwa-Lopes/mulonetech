import { readFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import pg from "pg";

const { Client } = pg;

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const digest = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${digest}`;
}

async function loadLocalEnvFile() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  try {
    const raw = await readFile(envPath, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const separator = trimmed.indexOf("=");
      if (separator <= 0) continue;
      const key = trimmed.slice(0, separator).trim();
      const value = trimmed.slice(separator + 1).trim();
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    // ignore when .env.local does not exist
  }
}

await loadLocalEnvFile();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL nao definido.");
  process.exit(1);
}

const schemaPath = path.resolve(process.cwd(), "lib/db/schema.sql");
const schemaSql = await readFile(schemaPath, "utf8");

const client = new Client({
  connectionString: databaseUrl,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
});

try {
  await client.connect();
  await client.query(schemaSql);

  const adminEmail = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  const adminPassword = (process.env.ADMIN_PASSWORD ?? "").trim();

  if (adminEmail && adminPassword) {
    await client.query(
      `insert into admin_users (email, password_hash, role, is_active, updated_at)
       values ($1, $2, 'admin', true, now())
       on conflict (email) do update
       set password_hash = excluded.password_hash,
           role = excluded.role,
           is_active = true,
           updated_at = now()`,
      [adminEmail, hashPassword(adminPassword)]
    );
    console.log("Utilizador admin sincronizado em admin_users.");
  }

  await client.query(
    `insert into app_settings (key, value)
     values ('system', '{"provider":"postgresql","version":1}'::jsonb)
     on conflict (key) do update
     set value = excluded.value, updated_at = now()`
  );

  await client.query(
    `insert into app_settings (key, value, updated_at)
     values (
       'branding',
       $1::jsonb,
       now()
     )
     on conflict (key) do update
     set value = excluded.value,
         updated_at = now()`,
    [
      JSON.stringify({
        brandName: "Mulone Tech",
        brandTagline: "Solucoes digitais inteligentes",
        brandLogoUrl: "/logo-navbar.png",
      }),
    ]
  );

  await client.query("alter table hero_content add column if not exists radar_eyebrow text");
  await client.query("alter table hero_content add column if not exists radar_title text");
  await client.query("alter table hero_content add column if not exists radar_description text");

  await client.query(
    `insert into hero_content (
       id, badge, title, subtitle, radar_eyebrow, radar_title, radar_description,
       cta_primary_label, cta_primary_href, cta_secondary_label, cta_secondary_href
     ) values (
       1,
       'Agencia de tecnologia para negocios em crescimento',
       'Construimos solucoes digitais inteligentes que fazem a sua marca avancar mais rapido.',
       'Estrategia, design e engenharia numa so equipa. Criamos websites, plataformas internas, consultorias e sistemas de seguranca com foco em performance, confianca e escala.',
       'Relatorio Mulone',
       'Radar de crescimento digital',
       'Acompanhamos metricas, automacoes e melhorias semanais para manter a sua operacao digital competitiva.',
       'Quero um diagnostico gratuito',
       '#contacto',
       'Ver projectos recentes',
       '#projectos'
     )
     on conflict (id) do update
     set badge = excluded.badge,
         title = excluded.title,
         subtitle = excluded.subtitle,
         radar_eyebrow = excluded.radar_eyebrow,
         radar_title = excluded.radar_title,
         radar_description = excluded.radar_description,
         cta_primary_label = excluded.cta_primary_label,
         cta_primary_href = excluded.cta_primary_href,
         cta_secondary_label = excluded.cta_secondary_label,
         cta_secondary_href = excluded.cta_secondary_href`
  );

  await client.query(
    `insert into hero_stats (id, value, label, sort_order)
     values
       (1, '+80', 'Projectos entregues', 0),
       (2, '24h', 'Suporte estrategico', 1),
       (3, '98%', 'Satisfacao de clientes', 2)
     on conflict (id) do update
     set value = excluded.value,
         label = excluded.label,
         sort_order = excluded.sort_order`
  );

  await client.query(
    `insert into services_section (id, eyebrow, title, description)
     values (
       1,
       'Servicos',
       'Um estudio completo para acelerar o seu negocio',
       'Da estrategia ao lancamento, entregamos solucoes digitais com acompanhamento continuo e indicadores reais de impacto.'
     )
     on conflict (id) do update
     set eyebrow = excluded.eyebrow,
         title = excluded.title,
         description = excluded.description`
  );

  await client.query(
    `insert into services (id, icon, title, image_url, description, sort_order)
     values
       (1, 'globe', 'Websites e plataformas', '/uploads/services/1/1771652701854-devwebsitesplataformas.jpg', 'Sites institucionais, landing pages e portais com foco em performance, SEO e design autoral.', 0),
       (2, 'cpu', 'Consultoria estrategica', '/uploads/services/2/1771653790193-consultoria.avif', 'Mapeamento de processos, automacoes, cloud e arquitectura digital para escalar operacoes.', 1),
       (3, 'shield', 'Sistemas de seguranca', '/uploads/services/3/1771656251077-sistemadeseguranca.jpeg', 'Alarmes, controlo de acesso e redes com monitorizacao inteligente para ambientes criticos.', 2),
       (4, 'camera', 'Monitorizacao inteligente', '/uploads/services/4/1771652723307-camerasdeseguranca2.webp', 'Camaras integradas com analises e alertas em tempo real para a sua equipa.', 3),
       (5, 'layers', 'Produtos a medida', '/uploads/services/5/1771654255611-produto.png', 'Solucoes digitais personalizadas para desafios unicos da sua empresa.', 4),
       (6, 'sparkles', 'Branding e experiencia', '/uploads/services/10/1771653136052-uiuxdesign.webp', 'Identidade visual, UX e conteudo alinhados ao posicionamento e as metas comerciais.', 5)
     on conflict (id) do update
     set icon = excluded.icon,
         title = excluded.title,
         image_url = excluded.image_url,
         description = excluded.description,
         sort_order = excluded.sort_order`
  );

  await client.query(
    `insert into projects_section (id, eyebrow, title, description)
     values (
       1,
       'Projectos',
       'Algumas entregas recentes com impacto real',
       'Cada projecto nasce com estrategia, performance e uma historia visual unica para a sua marca.'
     )
     on conflict (id) do update
     set eyebrow = excluded.eyebrow,
         title = excluded.title,
         description = excluded.description`
  );

  await client.query(
    `insert into projects (id, title, tag, image_url, description, sort_order)
     values
       (1, 'Portal corporativo', 'SaaS / B2B', '/uploads/projects/1/1771536523237-Screenshot__339_.png', 'Reestruturamos a presenca digital com foco em conversao e posicionamento premium.', 0),
       (2, 'App de monitorizacao', 'Seguranca', '/uploads/projects/2/1771686080018-Screenshot__361_.png', 'Dashboard em tempo real com alertas criticos para equipas distribuidas.', 1),
       (3, 'Branding e site', 'Retalho', '/uploads/projects/1/1771509156258-7486.jpg', 'Nova identidade e e-commerce com navegacao fluida e conteudo estrategico.', 2)
     on conflict (id) do update
     set title = excluded.title,
         tag = excluded.tag,
         image_url = excluded.image_url,
         description = excluded.description,
         sort_order = excluded.sort_order`
  );

  await client.query(
    `insert into testimonials_section (id, eyebrow, title, description)
     values (
       1,
       'Depoimentos',
       'Parceiros que confiam na Mulone Tech',
       'O nosso foco e criar relacionamentos de longo prazo com resultados mensuraveis.'
     )
     on conflict (id) do update
     set eyebrow = excluded.eyebrow,
         title = excluded.title,
         description = excluded.description`
  );

  await client.query(
    `insert into testimonials (id, name, role, quote, sort_order)
     values
       (1, 'Carla Mendes', 'Directora de Operacoes', 'A equipa traduziu o nosso desafio num sistema claro e escalavel. A operacao ficou mais leve.', 0),
       (2, 'Joao Mateus', 'CEO, Grupo Nova', 'O site renovou a nossa presenca digital. Subimos leads qualificados nas primeiras semanas.', 1),
       (3, 'Yara Silva', 'Gestora de Seguranca', 'As solucoes integradas trouxeram visibilidade total e reduziram incidentes.', 2)
     on conflict (id) do update
     set name = excluded.name,
         role = excluded.role,
         quote = excluded.quote,
         sort_order = excluded.sort_order`
  );

  await client.query(
    `insert into contact_section (id, eyebrow, title, description, badges)
     values (
       1,
       'Vamos conversar',
       'Pronto para acelerar o seu crescimento digital?',
       'Envie a sua necessidade e respondemos com um plano claro de accao ate 48 horas.',
       array['Atendimento consultivo', 'Diagnostico gratuito', 'Projectos a medida']
     )
     on conflict (id) do update
     set eyebrow = excluded.eyebrow,
         title = excluded.title,
         description = excluded.description,
         badges = excluded.badges`
  );

  console.log("Schema e conteudo inicial aplicados com sucesso.");
} catch (error) {
  console.error("Falha ao aplicar schema/setup:", error);
  process.exitCode = 1;
} finally {
  await client.end();
}

