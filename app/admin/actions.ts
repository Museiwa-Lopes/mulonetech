"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import crypto from "crypto";
import path from "path";
import { mkdir, writeFile, unlink } from "fs/promises";
import { getAdminSession } from "@/lib/auth/admin";
import { dbQuery, isDatabaseConfigured } from "@/lib/db/postgres";

type AdminSession = {
  email: string;
};

type ToastType = "success" | "error" | "info";

type AuditLogPayload = {
  actorEmail: string;
  action: string;
  entity: string;
  entityId?: string | null;
  details?: Record<string, unknown>;
};

async function requireAdmin() {
  const session = await getAdminSession();
  if (!session) {
    redirect("/admin/login");
  }
  return session as AdminSession;
}

function buildToastUrl(pathname: string, message: string, type: ToastType = "success") {
  const params = new URLSearchParams({
    toast: message,
    toastType: type,
  });
  return `${pathname}?${params.toString()}`;
}

function redirectWithToast(pathname: string, message: string, type: ToastType = "success"): never {
  redirect(buildToastUrl(pathname, message, type));
}

function revalidateMany(paths: string[]) {
  for (const path of paths) {
    revalidatePath(path);
  }
}

async function ensureAuditLogTable() {
  await dbQuery(
    `create table if not exists admin_audit_logs (
      id bigserial primary key,
      actor_email text not null,
      action text not null,
      entity text not null,
      entity_id text,
      details jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now()
    )`
  );
}

async function ensureProjectImagesTable() {
  await dbQuery(
    `create table if not exists project_images (
      id bigserial primary key,
      project_id int not null references projects(id) on delete cascade,
      image_url text not null,
      sort_order int not null default 0,
      created_at timestamptz not null default now()
    )`
  );
}

async function writeAuditLog(payload: AuditLogPayload) {
  try {
    await ensureAuditLogTable();
    await dbQuery(
      `insert into admin_audit_logs (actor_email, action, entity, entity_id, details)
       values ($1, $2, $3, $4, $5::jsonb)`,
      [
        payload.actorEmail,
        payload.action,
        payload.entity,
        payload.entityId ?? null,
        JSON.stringify(payload.details ?? {}),
      ]
    );
  } catch {
    // Keep UX working if audit logging fails.
  }
}

function cleanFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const digest = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${digest}`;
}

async function uploadImageLocally(file: File, folder: string, fallbackName: string) {
  if (!(file instanceof File) || file.size === 0) {
    return null;
  }

  const extension = file.name.includes(".") ? file.name.split(".").pop() : "jpg";
  const safeFileName = `${Date.now()}-${cleanFileName(file.name || `${fallbackName}.${extension}`)}`;
  const localFolder = path.join(process.cwd(), "public", "uploads", folder);
  const localPath = path.join(localFolder, safeFileName);
  await mkdir(localFolder, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(localPath, buffer);

  return path.posix.join("/uploads", folder.replaceAll("\\", "/"), safeFileName);
}

async function uploadServiceImage(file: File, serviceId: number) {
  return uploadImageLocally(file, `services/${serviceId}`, "image");
}

async function uploadBrandingLogo(file: File) {
  return uploadImageLocally(file, "branding", "logo");
}

async function uploadProjectImage(file: File, projectId: number) {
  return uploadImageLocally(file, `projects/${projectId}`, "image");
}

async function uploadProfileAvatar(file: File) {
  return uploadImageLocally(file, "profile", "avatar");
}

async function getNextId(tableName: "services" | "projects" | "testimonials") {
  const result = await dbQuery<{ next_id: number }>(
    `select coalesce(max(id), 0) + 1 as next_id from ${tableName}`
  );
  return result.rows[0]?.next_id ?? 1;
}

export async function updateProfileAction(formData: FormData) {
  const session = await requireAdmin();
  if (!isDatabaseConfigured()) {
    redirectWithToast("/admin/conteudos", "Base de dados não configurada.", "error");
  }

  const displayName = String(formData.get("display_name") ?? "");
  const role = String(formData.get("role") ?? "");
  const bio = String(formData.get("bio") ?? "");
  const avatarUrlInput = String(formData.get("avatar_url") ?? "");
  const avatarFile = formData.get("avatar_file") as File | null;
  const uploadedAvatarUrl = avatarFile ? await uploadProfileAvatar(avatarFile) : null;
  const avatarUrl = uploadedAvatarUrl ?? avatarUrlInput;

  await dbQuery(
    `insert into admin_profile (id, display_name, role, bio, avatar_url)
     values (1, $1, $2, $3, $4)
     on conflict (id) do update
     set display_name = excluded.display_name,
         role = excluded.role,
         bio = excluded.bio,
         avatar_url = excluded.avatar_url`,
    [displayName, role, bio, avatarUrl]
  );

  await writeAuditLog({
    actorEmail: session.email,
    action: "update",
    entity: "admin_profile",
    entityId: "1",
    details: {
      updatedFields: ["display_name", "role", "bio", "avatar_url"],
      uploadedAvatar: Boolean(uploadedAvatarUrl),
    },
  });

  revalidateMany(["/admin", "/admin/conteudos", "/admin/configuracoes"]);
  redirectWithToast("/admin/conteudos", "Perfil atualizado com sucesso.");
}

export async function replyMessageAction(formData: FormData) {
  const session = await requireAdmin();
  if (!isDatabaseConfigured()) {
    redirectWithToast("/admin/mensagens", "Base de dados não configurada.", "error");
  }

  const messageId = Number(formData.get("message_id"));
  const reply = String(formData.get("reply") ?? "");

  await dbQuery("update messages set reply = $1, status = 'respondido' where id = $2", [
    reply,
    messageId,
  ]);

  await writeAuditLog({
    actorEmail: session.email,
    action: "reply",
    entity: "message",
    entityId: String(messageId),
    details: { status: "respondido" },
  });

  revalidateMany(["/admin", "/admin/mensagens"]);
  redirectWithToast("/admin/mensagens", "Resposta guardada com sucesso.");
}

export async function updateHeroAction(formData: FormData) {
  const session = await requireAdmin();
  if (!isDatabaseConfigured()) {
    redirectWithToast("/admin/conteudos", "Base de dados não configurada.", "error");
  }

  await dbQuery("alter table hero_content add column if not exists radar_eyebrow text");
  await dbQuery("alter table hero_content add column if not exists radar_title text");
  await dbQuery("alter table hero_content add column if not exists radar_description text");

  const badge = String(formData.get("hero_badge") ?? "");
  const title = String(formData.get("hero_title") ?? "");
  const subtitle = String(formData.get("hero_subtitle") ?? "");
  const radarEyebrow = String(formData.get("hero_radar_eyebrow") ?? "");
  const radarTitle = String(formData.get("hero_radar_title") ?? "");
  const radarDescription = String(formData.get("hero_radar_description") ?? "");
  const ctaPrimaryLabel = String(formData.get("hero_cta_primary_label") ?? "");
  const ctaPrimaryHref = String(formData.get("hero_cta_primary_href") ?? "");
  const ctaSecondaryLabel = String(formData.get("hero_cta_secondary_label") ?? "");
  const ctaSecondaryHref = String(formData.get("hero_cta_secondary_href") ?? "");

  await dbQuery(
    `insert into hero_content (
       id, badge, title, subtitle, radar_eyebrow, radar_title, radar_description,
       cta_primary_label, cta_primary_href, cta_secondary_label, cta_secondary_href
     ) values (1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
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
         cta_secondary_href = excluded.cta_secondary_href`,
    [
      badge,
      title,
      subtitle,
      radarEyebrow,
      radarTitle,
      radarDescription,
      ctaPrimaryLabel,
      ctaPrimaryHref,
      ctaSecondaryLabel,
      ctaSecondaryHref,
    ]
  );

  await writeAuditLog({
    actorEmail: session.email,
    action: "update",
    entity: "hero_content",
    entityId: "1",
    details: { updatedFields: ["badge", "title", "subtitle", "radar", "cta"] },
  });

  revalidateMany(["/", "/admin", "/admin/conteudos"]);
  redirectWithToast("/admin/conteudos", "Hero atualizado com sucesso.");
}

export async function updateHeroStatsAction(formData: FormData) {
  const session = await requireAdmin();
  if (!isDatabaseConfigured()) {
    redirectWithToast("/admin/conteudos", "Base de dados não configurada.", "error");
  }

  const count = Number(formData.get("hero_stats_count") ?? 0);
  const stats = Array.from({ length: count }, (_, index) => ({
    id: Number(formData.get(`hero_stats_id_${index}`)),
    value: String(formData.get(`hero_stats_value_${index}`) ?? ""),
    label: String(formData.get(`hero_stats_label_${index}`) ?? ""),
    sortOrder: Number(formData.get(`hero_stats_order_${index}`) ?? index),
  }));

  for (const stat of stats) {
    await dbQuery(
      `insert into hero_stats (id, value, label, sort_order)
       values ($1, $2, $3, $4)
       on conflict (id) do update
       set value = excluded.value, label = excluded.label, sort_order = excluded.sort_order`,
      [stat.id, stat.value, stat.label, stat.sortOrder]
    );
  }

  await writeAuditLog({
    actorEmail: session.email,
    action: "update",
    entity: "hero_stats",
    details: { total: stats.length },
  });

  revalidateMany(["/", "/admin", "/admin/conteudos"]);
  redirectWithToast("/admin/conteudos", "Estatísticas atualizadas com sucesso.");
}

export async function updateServicesSectionAction(formData: FormData) {
  const session = await requireAdmin();
  if (!isDatabaseConfigured()) {
    redirectWithToast("/admin/servicos", "Base de dados não configurada.", "error");
  }

  const eyebrow = String(formData.get("services_eyebrow") ?? "");
  const title = String(formData.get("services_title") ?? "");
  const description = String(formData.get("services_description") ?? "");

  await dbQuery(
    `insert into services_section (id, eyebrow, title, description)
     values (1, $1, $2, $3)
     on conflict (id) do update
     set eyebrow = excluded.eyebrow,
         title = excluded.title,
         description = excluded.description`,
    [eyebrow, title, description]
  );

  await writeAuditLog({
    actorEmail: session.email,
    action: "update",
    entity: "services_section",
    entityId: "1",
  });

  revalidateMany(["/", "/admin", "/admin/servicos"]);
  redirectWithToast("/admin/servicos", "Secção de serviços atualizada.");
}

export async function updateServicesAction(formData: FormData) {
  const session = await requireAdmin();
  if (!isDatabaseConfigured()) {
    redirectWithToast("/admin/servicos", "Base de dados não configurada.", "error");
  }

  await dbQuery("alter table services add column if not exists image_url text");

  const count = Number(formData.get("services_count") ?? 0);
  const services = Array.from({ length: count }, (_, index) => ({
    id: Number(formData.get(`services_id_${index}`)),
    icon: String(formData.get(`services_icon_${index}`) ?? "globe"),
    title: String(formData.get(`services_title_${index}`) ?? ""),
    imageUrl: String(formData.get(`services_image_url_${index}`) ?? ""),
    imageFile: formData.get(`services_image_file_${index}`),
    description: String(formData.get(`services_description_${index}`) ?? ""),
    sortOrder: Number(formData.get(`services_order_${index}`) ?? index),
  }));

  let uploadedImages = 0;
  for (const service of services) {
    const uploadedImageUrl = await uploadServiceImage(service.imageFile as File, service.id);
    if (uploadedImageUrl) {
      uploadedImages += 1;
    }
    const imageUrl = uploadedImageUrl ?? service.imageUrl;

    await dbQuery(
      `insert into services (id, icon, title, image_url, description, sort_order)
       values ($1, $2, $3, $4, $5, $6)
       on conflict (id) do update
       set icon = excluded.icon,
           title = excluded.title,
           image_url = excluded.image_url,
           description = excluded.description,
           sort_order = excluded.sort_order`,
      [service.id, service.icon, service.title, imageUrl, service.description, service.sortOrder]
    );
  }

  await writeAuditLog({
    actorEmail: session.email,
    action: "update",
    entity: "services",
    details: {
      total: services.length,
      uploads: uploadedImages,
    },
  });

  revalidateMany(["/", "/admin", "/admin/servicos"]);
  redirectWithToast("/admin/servicos", "Serviços guardados com sucesso.");
}

export async function addServiceAction() {
  const session = await requireAdmin();
  if (!isDatabaseConfigured()) {
    redirectWithToast("/admin/servicos", "Base de dados não configurada.", "error");
  }

  await dbQuery("alter table services add column if not exists image_url text");
  const id = await getNextId("services");

  await dbQuery(
    `insert into services (id, icon, title, image_url, description, sort_order)
     values ($1, 'globe', $2, '', $3, $4)`,
    [id, `Novo serviço ${id}`, "Descreva este serviço.", id]
  );

  await writeAuditLog({
    actorEmail: session.email,
    action: "create",
    entity: "service",
    entityId: String(id),
  });

  revalidateMany(["/", "/admin/servicos"]);
  redirectWithToast("/admin/servicos", "Serviço adicionado com sucesso.");
}

export async function deleteServiceAction(serviceId: number) {
  const session = await requireAdmin();
  if (!isDatabaseConfigured()) {
    redirectWithToast("/admin/servicos", "Base de dados não configurada.", "error");
  }

  if (!Number.isFinite(serviceId) || serviceId <= 0) {
    redirectWithToast("/admin/servicos", "Serviço inválido.", "error");
  }

  const countResult = await dbQuery<{ total: string }>("select count(*)::text as total from services");
  const total = Number(countResult.rows[0]?.total ?? 0);
  if (total <= 1) {
    redirectWithToast("/admin/servicos", "É necessário manter pelo menos um serviço.", "error");
  }

  await dbQuery("delete from services where id = $1", [serviceId]);
  await writeAuditLog({
    actorEmail: session.email,
    action: "delete",
    entity: "service",
    entityId: String(serviceId),
  });
  revalidateMany(["/", "/admin/servicos"]);
  redirectWithToast("/admin/servicos", "Serviço removido com sucesso.");
}

export async function updateProjectsSectionAction(formData: FormData) {
  const session = await requireAdmin();
  if (!isDatabaseConfigured()) {
    redirectWithToast("/admin/projectos", "Base de dados não configurada.", "error");
  }

  const eyebrow = String(formData.get("projects_eyebrow") ?? "");
  const title = String(formData.get("projects_title") ?? "");
  const description = String(formData.get("projects_description") ?? "");

  await dbQuery(
    `insert into projects_section (id, eyebrow, title, description)
     values (1, $1, $2, $3)
     on conflict (id) do update
     set eyebrow = excluded.eyebrow,
         title = excluded.title,
         description = excluded.description`,
    [eyebrow, title, description]
  );

  await writeAuditLog({
    actorEmail: session.email,
    action: "update",
    entity: "projects_section",
    entityId: "1",
  });

  revalidateMany(["/", "/admin", "/admin/projectos"]);
  redirectWithToast("/admin/projectos", "Secção de projectos atualizada.");
}

export async function updateProjectsAction(formData: FormData) {
  const session = await requireAdmin();
  if (!isDatabaseConfigured()) {
    redirectWithToast("/admin/projectos", "Base de dados não configurada.", "error");
  }

  await dbQuery("alter table projects add column if not exists image_url text");
  await ensureProjectImagesTable();

  const count = Number(formData.get("projects_count") ?? 0);
  const projects = Array.from({ length: count }, (_, index) => ({
    id: Number(formData.get(`projects_id_${index}`)),
    title: String(formData.get(`projects_title_${index}`) ?? ""),
    tag: String(formData.get(`projects_tag_${index}`) ?? ""),
    imageUrl: String(formData.get(`projects_image_url_${index}`) ?? ""),
    imageFile: formData.get(`projects_image_file_${index}`),
    imageFiles: formData.getAll(`projects_images_files_${index}`),
    description: String(formData.get(`projects_description_${index}`) ?? ""),
    sortOrder: Number(formData.get(`projects_order_${index}`) ?? index),
  }));

  let uploadedImages = 0;
  for (const project of projects) {
    const uploadedImageUrl = await uploadProjectImage(project.imageFile as File, project.id);
    if (uploadedImageUrl) {
      uploadedImages += 1;
    }
    const extraUploads = (project.imageFiles as unknown[])
      .filter((file): file is File => file instanceof File && file.size > 0);

    const uploadedGalleryUrls: string[] = [];
    for (const file of extraUploads) {
      const url = await uploadProjectImage(file, project.id);
      if (url) {
        uploadedGalleryUrls.push(url);
      }
    }

    if (uploadedGalleryUrls.length > 0) {
      uploadedImages += uploadedGalleryUrls.length;
      const orderResult = await dbQuery<{ next_order: number }>(
        `select coalesce(max(sort_order), -1) + 1 as next_order
         from project_images
         where project_id = $1`,
        [project.id]
      );
      let nextOrder = Number(orderResult.rows[0]?.next_order ?? 0);
      for (const url of uploadedGalleryUrls) {
        await dbQuery(
          `insert into project_images (project_id, image_url, sort_order)
           values ($1, $2, $3)`,
          [project.id, url, nextOrder]
        );
        nextOrder += 1;
      }
    }

    const imageUrl = uploadedImageUrl ?? project.imageUrl ?? uploadedGalleryUrls[0] ?? "";

    await dbQuery(
      `insert into projects (id, title, tag, image_url, description, sort_order)
       values ($1, $2, $3, $4, $5, $6)
       on conflict (id) do update
       set title = excluded.title,
           tag = excluded.tag,
           image_url = excluded.image_url,
           description = excluded.description,
           sort_order = excluded.sort_order`,
      [project.id, project.title, project.tag, imageUrl, project.description, project.sortOrder]
    );
  }

  await writeAuditLog({
    actorEmail: session.email,
    action: "update",
    entity: "projects",
    details: {
      total: projects.length,
      uploads: uploadedImages,
    },
  });

  revalidateMany(["/", "/admin", "/admin/projectos"]);
  redirectWithToast("/admin/projectos", "Projectos guardados com sucesso.");
}

export async function addProjectAction() {
  const session = await requireAdmin();
  if (!isDatabaseConfigured()) {
    redirectWithToast("/admin/projectos", "Base de dados não configurada.", "error");
  }

  await dbQuery("alter table projects add column if not exists image_url text");
  await ensureProjectImagesTable();
  const id = await getNextId("projects");

  await dbQuery(
    `insert into projects (id, title, tag, image_url, description, sort_order)
     values ($1, $2, $3, '', $4, $5)`,
    [id, `Novo projecto ${id}`, "Categoria", "Descreva este projecto.", id]
  );

  await writeAuditLog({
    actorEmail: session.email,
    action: "create",
    entity: "project",
    entityId: String(id),
  });

  revalidateMany(["/", "/admin/projectos"]);
  redirectWithToast("/admin/projectos", "Projecto adicionado com sucesso.");
}

export async function deleteProjectAction(projectId: number) {
  const session = await requireAdmin();
  if (!isDatabaseConfigured()) {
    redirectWithToast("/admin/projectos", "Base de dados não configurada.", "error");
  }

  if (!Number.isFinite(projectId) || projectId <= 0) {
    redirectWithToast("/admin/projectos", "Projecto inválido.", "error");
  }

  const countResult = await dbQuery<{ total: string }>("select count(*)::text as total from projects");
  const total = Number(countResult.rows[0]?.total ?? 0);
  if (total <= 1) {
    redirectWithToast("/admin/projectos", "É necessário manter pelo menos um projecto.", "error");
  }

  await ensureProjectImagesTable();
  await dbQuery("delete from project_images where project_id = $1", [projectId]);
  await dbQuery("delete from projects where id = $1", [projectId]);
  await writeAuditLog({
    actorEmail: session.email,
    action: "delete",
    entity: "project",
    entityId: String(projectId),
  });
  revalidateMany(["/", "/admin/projectos"]);
  redirectWithToast("/admin/projectos", "Projecto removido com sucesso.");
}

export async function deleteProjectImageAction(
  imageId: number,
  projectId: number,
  _formData: FormData
) {
  const session = await requireAdmin();
  try {
    if (!isDatabaseConfigured()) {
      redirectWithToast("/admin/projectos", "Base de dados não configurada.", "error");
    }

    const safeImageId = Number(imageId);
    const safeProjectId = Number(projectId);

    if (
      !Number.isFinite(safeImageId) ||
      safeImageId <= 0 ||
      !Number.isFinite(safeProjectId) ||
      safeProjectId <= 0
    ) {
      redirectWithToast("/admin/projectos", "Imagem inválida.", "error");
    }

    await ensureProjectImagesTable();

    const deletedResult = await dbQuery<{ image_url: string }>(
      `delete from project_images
       where id = $1 and project_id = $2
       returning image_url`,
      [safeImageId, safeProjectId]
    );

    const deletedUrl = deletedResult.rows[0]?.image_url;
    if (!deletedUrl) {
      redirectWithToast("/admin/projectos", "Imagem não encontrada.", "error");
    }

    const currentMainResult = await dbQuery<{ image_url: string | null }>(
      "select image_url from projects where id = $1 limit 1",
      [safeProjectId]
    );
    const currentMain = currentMainResult.rows[0]?.image_url ?? "";

    if (currentMain && currentMain === deletedUrl) {
      const replacementResult = await dbQuery<{ image_url: string }>(
        `select image_url
         from project_images
         where project_id = $1
         order by sort_order asc, id asc
         limit 1`,
        [safeProjectId]
      );
      const replacement = replacementResult.rows[0]?.image_url ?? "";
      await dbQuery("update projects set image_url = $1 where id = $2", [replacement, safeProjectId]);
    }

    if (deletedUrl?.startsWith("/uploads/")) {
      const filePath = path.join(
        process.cwd(),
        "public",
        deletedUrl.replace(/^\//, "").replaceAll("/", path.sep)
      );
      try {
        await unlink(filePath);
      } catch {
        // File can be already removed or inaccessible; ignore.
      }
    }

    await writeAuditLog({
      actorEmail: session.email,
      action: "delete",
      entity: "project_image",
      entityId: String(safeImageId),
      details: { projectId: safeProjectId },
    });

    revalidateMany(["/", "/admin", "/admin/projectos"]);
    redirectWithToast("/admin/projectos", "Fotografia removida com sucesso.");
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      String((error as { digest?: string }).digest).includes("NEXT_REDIRECT")
    ) {
      throw error;
    }
    console.error("Erro ao remover fotografia do projecto:", error);
    redirectWithToast("/admin/projectos", "Erro interno ao remover fotografia.", "error");
  }
}

export async function updateTestimonialsSectionAction(formData: FormData) {
  const session = await requireAdmin();
  if (!isDatabaseConfigured()) {
    redirectWithToast("/admin/conteudos", "Base de dados não configurada.", "error");
  }

  const eyebrow = String(formData.get("testimonials_eyebrow") ?? "");
  const title = String(formData.get("testimonials_title") ?? "");
  const description = String(formData.get("testimonials_description") ?? "");

  await dbQuery(
    `insert into testimonials_section (id, eyebrow, title, description)
     values (1, $1, $2, $3)
     on conflict (id) do update
     set eyebrow = excluded.eyebrow,
         title = excluded.title,
         description = excluded.description`,
    [eyebrow, title, description]
  );

  await writeAuditLog({
    actorEmail: session.email,
    action: "update",
    entity: "testimonials_section",
    entityId: "1",
  });
  revalidateMany(["/", "/admin", "/admin/conteudos"]);
  redirectWithToast("/admin/conteudos", "Secção de depoimentos atualizada.");
}

export async function updateTestimonialsAction(formData: FormData) {
  const session = await requireAdmin();
  if (!isDatabaseConfigured()) {
    redirectWithToast("/admin/conteudos", "Base de dados não configurada.", "error");
  }

  const count = Number(formData.get("testimonials_count") ?? 0);
  const testimonials = Array.from({ length: count }, (_, index) => ({
    id: Number(formData.get(`testimonials_id_${index}`)),
    name: String(formData.get(`testimonials_name_${index}`) ?? ""),
    role: String(formData.get(`testimonials_role_${index}`) ?? ""),
    quote: String(formData.get(`testimonials_quote_${index}`) ?? ""),
    sortOrder: Number(formData.get(`testimonials_order_${index}`) ?? index),
  }));

  for (const testimonial of testimonials) {
    await dbQuery(
      `insert into testimonials (id, name, role, quote, sort_order)
       values ($1, $2, $3, $4, $5)
       on conflict (id) do update
       set name = excluded.name,
           role = excluded.role,
           quote = excluded.quote,
           sort_order = excluded.sort_order`,
      [testimonial.id, testimonial.name, testimonial.role, testimonial.quote, testimonial.sortOrder]
    );
  }

  await writeAuditLog({
    actorEmail: session.email,
    action: "update",
    entity: "testimonials",
    details: { total: testimonials.length },
  });

  revalidateMany(["/", "/admin", "/admin/conteudos"]);
  redirectWithToast("/admin/conteudos", "Depoimentos guardados com sucesso.");
}

export async function addTestimonialAction() {
  const session = await requireAdmin();
  if (!isDatabaseConfigured()) {
    redirectWithToast("/admin/conteudos", "Base de dados não configurada.", "error");
  }

  const id = await getNextId("testimonials");
  await dbQuery(
    `insert into testimonials (id, name, role, quote, sort_order)
     values ($1, $2, $3, $4, $5)`,
    [id, `Parceiro ${id}`, "Cargo", "Novo depoimento.", id]
  );

  await writeAuditLog({
    actorEmail: session.email,
    action: "create",
    entity: "testimonial",
    entityId: String(id),
  });
  revalidateMany(["/", "/admin/conteudos"]);
  redirectWithToast("/admin/conteudos", "Depoimento adicionado com sucesso.");
}

export async function deleteTestimonialAction(testimonialId: number) {
  const session = await requireAdmin();
  if (!isDatabaseConfigured()) {
    redirectWithToast("/admin/conteudos", "Base de dados não configurada.", "error");
  }

  if (!Number.isFinite(testimonialId) || testimonialId <= 0) {
    redirectWithToast("/admin/conteudos", "Depoimento inválido.", "error");
  }

  const countResult = await dbQuery<{ total: string }>("select count(*)::text as total from testimonials");
  const total = Number(countResult.rows[0]?.total ?? 0);
  if (total <= 1) {
    redirectWithToast("/admin/conteudos", "É necessário manter pelo menos um depoimento.", "error");
  }

  await dbQuery("delete from testimonials where id = $1", [testimonialId]);
  await writeAuditLog({
    actorEmail: session.email,
    action: "delete",
    entity: "testimonial",
    entityId: String(testimonialId),
  });
  revalidateMany(["/", "/admin/conteudos"]);
  redirectWithToast("/admin/conteudos", "Depoimento removido com sucesso.");
}

export async function updateContactAction(formData: FormData) {
  const session = await requireAdmin();
  if (!isDatabaseConfigured()) {
    redirectWithToast("/admin/conteudos", "Base de dados não configurada.", "error");
  }

  const eyebrow = String(formData.get("contact_eyebrow") ?? "");
  const title = String(formData.get("contact_title") ?? "");
  const description = String(formData.get("contact_description") ?? "");
  const badges = [
    String(formData.get("contact_badge_0") ?? ""),
    String(formData.get("contact_badge_1") ?? ""),
    String(formData.get("contact_badge_2") ?? ""),
  ].filter(Boolean);

  await dbQuery(
    `insert into contact_section (id, eyebrow, title, description, badges)
     values (1, $1, $2, $3, $4)
     on conflict (id) do update
     set eyebrow = excluded.eyebrow,
         title = excluded.title,
         description = excluded.description,
         badges = excluded.badges`,
    [eyebrow, title, description, badges]
  );

  await writeAuditLog({
    actorEmail: session.email,
    action: "update",
    entity: "contact_section",
    entityId: "1",
  });

  revalidateMany(["/", "/admin", "/admin/conteudos"]);
  redirectWithToast("/admin/conteudos", "Contacto atualizado com sucesso.");
}

export async function createAdminUserAction(formData: FormData) {
  const session = await requireAdmin();
  if (!isDatabaseConfigured()) {
    redirectWithToast("/admin/utilizadores", "Base de dados não configurada.", "error");
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "").trim();
  const role = String(formData.get("role") ?? "admin").trim() || "admin";

  if (!email || !password) {
    redirectWithToast("/admin/utilizadores", "Preencha e-mail e palavra-passe.", "error");
  }

  await dbQuery(
    `insert into admin_users (email, password_hash, role, is_active, updated_at)
     values ($1, $2, $3, true, now())
     on conflict (email) do update
     set password_hash = excluded.password_hash,
         role = excluded.role,
         is_active = true,
         updated_at = now()`,
    [email, hashPassword(password), role]
  );

  await writeAuditLog({
    actorEmail: session.email,
    action: "upsert",
    entity: "admin_user",
    entityId: email,
    details: { role, activated: true },
  });

  revalidateMany(["/admin/utilizadores", "/admin/configuracoes"]);
  redirectWithToast("/admin/utilizadores", "Utilizador guardado com sucesso.");
}

export async function toggleAdminUserStatusAction(formData: FormData) {
  const session = await requireAdmin();
  if (!isDatabaseConfigured()) {
    redirectWithToast("/admin/utilizadores", "Base de dados não configurada.", "error");
  }

  const userId = Number(formData.get("user_id"));
  if (!Number.isFinite(userId) || userId <= 0) {
    redirectWithToast("/admin/utilizadores", "Utilizador inválido.", "error");
  }

  const result = await dbQuery<{ email: string; is_active: boolean }>(
    `update admin_users
     set is_active = not is_active, updated_at = now()
     where id = $1
     returning email, is_active`,
    [userId]
  );

  await writeAuditLog({
    actorEmail: session.email,
    action: "toggle_status",
    entity: "admin_user",
    entityId: String(userId),
    details: {
      email: result.rows[0]?.email ?? null,
      isActive: result.rows[0]?.is_active ?? null,
    },
  });

  revalidateMany(["/admin/utilizadores"]);
  redirectWithToast(
    "/admin/utilizadores",
    result.rows[0]?.is_active ? "Utilizador ativado." : "Utilizador desativado."
  );
}

export async function updateBrandingSettingsAction(formData: FormData) {
  const session = await requireAdmin();
  if (!isDatabaseConfigured()) {
    redirectWithToast("/admin/configuracoes", "Base de dados não configurada.", "error");
  }

  const brandName = String(formData.get("brand_name") ?? "").trim() || "Mulone Tech";
  const brandTagline =
    String(formData.get("brand_tagline") ?? "").trim() || "Soluções digitais inteligentes";
  const logoUrlInput = String(formData.get("brand_logo_url") ?? "").trim();
  const logoFile = formData.get("brand_logo_file") as File | null;

  const uploadedLogoUrl = logoFile ? await uploadBrandingLogo(logoFile) : null;
  const brandLogoUrl = uploadedLogoUrl ?? logoUrlInput;

  await dbQuery(
    `insert into app_settings (key, value, updated_at)
     values ('branding', $1::jsonb, now())
     on conflict (key) do update
     set value = excluded.value, updated_at = now()`,
    [
      JSON.stringify({
        brandName,
        brandTagline,
        brandLogoUrl,
      }),
    ]
  );

  await writeAuditLog({
    actorEmail: session.email,
    action: "update",
    entity: "branding",
    entityId: "app_settings:branding",
    details: {
      brandName,
      uploadedLogo: Boolean(uploadedLogoUrl),
    },
  });

  revalidateMany(["/", "/admin/configuracoes"]);
  redirectWithToast("/admin/configuracoes", "Branding atualizado com sucesso.");
}


