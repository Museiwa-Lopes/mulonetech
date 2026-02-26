import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/admin";
import { dbQuery, isDatabaseConfigured } from "@/lib/db/postgres";
import { uploadImage } from "@/lib/storage/uploads";

function buildToastUrl(pathname: string, message: string, type: "success" | "error" | "info" = "success") {
  const params = new URLSearchParams({
    toast: message,
    toastType: type,
  });
  return `${pathname}?${params.toString()}`;
}

async function uploadServiceImage(file: File, serviceId: number) {
  return uploadImage(file, `services/${serviceId}`, "image");
}

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    const loginUrl = new URL("/admin/login", request.url);
    return NextResponse.redirect(loginUrl, 303);
  }

  if (!isDatabaseConfigured()) {
    const errorUrl = new URL(
      buildToastUrl("/admin/servicos", "Base de dados nao configurada.", "error"),
      request.url
    );
    return NextResponse.redirect(errorUrl, 303);
  }

  try {
    await dbQuery("alter table services add column if not exists image_url text");
    const formData = await request.formData();

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

    for (const service of services) {
      const uploadedImageUrl = await uploadServiceImage(service.imageFile as File, service.id);
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

    revalidatePath("/");
    revalidatePath("/admin");
    revalidatePath("/admin/servicos");

    const okUrl = new URL(buildToastUrl("/admin/servicos", "Servico guardado com sucesso."), request.url);
    return NextResponse.redirect(okUrl, 303);
  } catch {
    const failUrl = new URL(
      buildToastUrl("/admin/servicos", "Erro ao guardar servico.", "error"),
      request.url
    );
    return NextResponse.redirect(failUrl, 303);
  }
}
