import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth/admin";
import { dbQuery, isDatabaseConfigured } from "@/lib/db/postgres";
import {
  addServiceAction,
  deleteServiceAction,
  updateServicesSectionAction,
} from "../actions";
import { defaultServices, defaultServicesSection } from "@/lib/content/defaults";

type Service = {
  id: number;
  icon: string | null;
  title: string | null;
  image_url?: string | null;
  description: string | null;
  sort_order: number | null;
};

type ServicesSection = {
  eyebrow: string | null;
  title: string | null;
  description: string | null;
};

export default async function AdminServicesPage() {
  const session = await getAdminSession();
  if (!session) {
    redirect("/admin/login");
  }

  const hasDatabase = isDatabaseConfigured();
  let services: Service[] = [];
  let servicesSection: ServicesSection | null = null;

  if (hasDatabase) {
    try {
      const [servicesResult, sectionResult] = await Promise.all([
        dbQuery<Service>("select * from services order by sort_order asc"),
        dbQuery<ServicesSection>("select * from services_section where id = 1"),
      ]);
      services = servicesResult.rows;
      servicesSection = sectionResult.rows[0] ?? null;
    } catch {
      // keep defaults if table is missing
    }
  }

  const defaultServiceRows = defaultServices.map((service, index) => ({
    id: index + 1,
    icon: service.icon,
    title: service.title,
    image_url: (service as { imageUrl?: string }).imageUrl ?? "",
    description: service.description,
    sort_order: index,
  }));

  const dbServiceRows = services.map((service) => ({
    id: service.id,
    icon: service.icon ?? "globe",
    title: service.title ?? "",
    image_url: service.image_url ?? "",
    description: service.description ?? "",
    sort_order: service.sort_order ?? 0,
  }));

  const byId = new Map(dbServiceRows.map((service) => [service.id, service]));
  const missingFromDefaults = dbServiceRows.filter(
    (service) => !defaultServiceRows.some((item) => item.id === service.id)
  );

  const mergedServices = [...defaultServiceRows, ...missingFromDefaults]
    .map((service) => byId.get(service.id) ?? service)
    .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);

  const mergedSection = servicesSection
    ? {
        eyebrow: servicesSection.eyebrow ?? defaultServicesSection.eyebrow,
        title: servicesSection.title ?? defaultServicesSection.title,
        description: servicesSection.description ?? defaultServicesSection.description,
      }
    : defaultServicesSection;

  return (
    <main className="page-bg text-white">
      <div className="mx-auto min-h-[calc(100vh-64px)] max-w-6xl px-4 py-10 sm:px-6">
        <div className="card rounded-3xl p-6 sm:p-8">
          <p className="text-sm uppercase tracking-[0.2em] text-white/60">Admin</p>
          <h1 className="font-display mt-3 text-3xl font-semibold">Serviços</h1>
          <p className="mt-2 text-sm text-white/70">Gerir secção e lista de serviços do site.</p>
          {!hasDatabase ? (
            <p className="mt-3 text-sm text-[#ff8bb5]">
              PostgreSQL não configurado. Defina `DATABASE_URL`.
            </p>
          ) : null}
        </div>

        <section className="mt-6 grid gap-5 lg:grid-cols-2">
          <div className="card rounded-3xl p-6 sm:p-7">
            <h2 className="font-display text-xl font-semibold">Secção Serviços</h2>
            <form action={updateServicesSectionAction} className="mt-5 grid gap-3 text-sm">
              <label className="grid gap-2">
                Eyebrow
                <input
                  className="h-11 rounded-xl border border-white/10 bg-[#0b0f1a] px-4"
                  name="services_eyebrow"
                  defaultValue={mergedSection.eyebrow}
                />
              </label>
              <label className="grid gap-2">
                Título
                <input
                  className="h-11 rounded-xl border border-white/10 bg-[#0b0f1a] px-4"
                  name="services_title"
                  defaultValue={mergedSection.title}
                />
              </label>
              <label className="grid gap-2">
                Descrição
                <textarea
                  className="min-h-[120px] rounded-xl border border-white/10 bg-[#0b0f1a] px-4 py-3"
                  name="services_description"
                  defaultValue={mergedSection.description}
                />
              </label>
              <button className="btn-primary w-full" type="submit">
                Guardar secção
              </button>
            </form>
          </div>

          <div className="card rounded-3xl p-6 sm:p-7">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-xl font-semibold">Lista de Serviços</h2>
              <form action={addServiceAction}>
                <button className="btn-ghost text-xs" type="submit">
                  + Adicionar serviço
                </button>
              </form>
            </div>
            <div className="mt-5 grid gap-4 text-sm">
              {mergedServices.map((service, index) => (
                <div key={service.id} className="grid gap-3 rounded-2xl border border-white/10 p-4">
                  <form
                    action="/api/admin/services/update"
                    method="post"
                    encType="multipart/form-data"
                    className="grid gap-3"
                  >
                    <input type="hidden" name="services_count" value={1} />
                    <input type="hidden" name="services_id_0" value={service.id} />
                    <input type="hidden" name="services_order_0" value={service.sort_order} />
                    <label className="grid gap-2">
                      Ícone
                      <input
                        className="h-11 rounded-xl border border-white/10 bg-[#0b0f1a] px-4"
                        name="services_icon_0"
                        defaultValue={service.icon}
                      />
                    </label>
                    <label className="grid gap-2">
                      Título
                      <input
                        className="h-11 rounded-xl border border-white/10 bg-[#0b0f1a] px-4"
                        name="services_title_0"
                        defaultValue={service.title}
                      />
                    </label>
                    <label className="grid gap-2">
                      Fotografia (upload)
                      <input
                        className="h-11 rounded-xl border border-white/10 bg-[#0b0f1a] px-4 file:mr-3 file:rounded-md file:border-0 file:bg-white/10 file:px-3 file:py-1.5"
                        name="services_image_file_0"
                        type="file"
                        accept="image/*"
                      />
                    </label>
                    <label className="grid gap-2">
                      Fotografia URL
                      <input
                        className="h-11 rounded-xl border border-white/10 bg-[#0b0f1a] px-4"
                        name="services_image_url_0"
                        defaultValue={service.image_url}
                      />
                    </label>
                    {service.image_url ? (
                      <img
                        src={service.image_url}
                        alt={`Preview de ${service.title || `serviço ${index + 1}`}`}
                        className="h-28 w-full rounded-xl border border-white/10 object-cover"
                      />
                    ) : null}
                    <label className="grid gap-2">
                      Descrição
                      <textarea
                        className="min-h-[100px] rounded-xl border border-white/10 bg-[#0b0f1a] px-4 py-3"
                        name="services_description_0"
                        defaultValue={service.description}
                      />
                    </label>
                    <button className="btn-primary w-full" type="submit">
                      Guardar serviço
                    </button>
                  </form>
                  <form action={deleteServiceAction.bind(null, service.id)}>
                    <button className="btn-ghost w-full text-xs text-[#ff8bb5]" type="submit">
                      Remover serviço
                    </button>
                  </form>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}




