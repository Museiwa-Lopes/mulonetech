import { redirect } from "next/navigation";
import { getAdminSession, isAdminAuthConfigured } from "@/lib/auth/admin";
import { dbQuery, isDatabaseConfigured } from "@/lib/db/postgres";
import { updateBrandingSettingsAction } from "../actions";

type AppSettingRow = {
  value: unknown;
};

type BrandingSetting = {
  brandName?: string;
  brandTagline?: string;
  brandLogoUrl?: string;
};

export default async function AdminSettingsPage() {
  const session = await getAdminSession();
  if (!session) {
    redirect("/admin/login");
  }

  const authConfigured = await isAdminAuthConfigured();
  const dbConfigured = isDatabaseConfigured();

  let usersCount = 0;
  let servicesCount = 0;
  let projectsCount = 0;
  let messagesCount = 0;
  let contentTablesReady = false;
  let settingsCount = 0;
  let branding: BrandingSetting = {
    brandName: "Mulone Tech",
    brandTagline: "Soluções digitais inteligentes",
    brandLogoUrl: "",
  };

  if (dbConfigured) {
    try {
      const [
        usersResult,
        servicesResult,
        projectsResult,
        messagesResult,
        contentCheckResult,
        settingsResult,
        brandingResult,
      ] = await Promise.all([
        dbQuery<{ total: string }>("select count(*)::text as total from admin_users"),
        dbQuery<{ total: string }>("select count(*)::text as total from services"),
        dbQuery<{ total: string }>("select count(*)::text as total from projects"),
        dbQuery<{ total: string }>("select count(*)::text as total from messages"),
        dbQuery<{ total: string }>(
          `select count(*)::text as total
           from information_schema.tables
           where table_schema = 'public'
             and table_name in ('hero_content', 'hero_stats', 'services_section', 'projects_section', 'testimonials_section', 'testimonials', 'contact_section', 'admin_profile')`
        ),
        dbQuery<{ total: string }>("select count(*)::text as total from app_settings"),
        dbQuery<AppSettingRow>("select value from app_settings where key = 'branding' limit 1"),
      ]);

      usersCount = Number(usersResult.rows[0]?.total ?? 0);
      servicesCount = Number(servicesResult.rows[0]?.total ?? 0);
      projectsCount = Number(projectsResult.rows[0]?.total ?? 0);
      messagesCount = Number(messagesResult.rows[0]?.total ?? 0);
      contentTablesReady = Number(contentCheckResult.rows[0]?.total ?? 0) >= 8;
      settingsCount = Number(settingsResult.rows[0]?.total ?? 0);

      const brandingValue = brandingResult.rows[0]?.value;
      if (brandingValue && typeof brandingValue === "object") {
        const data = brandingValue as BrandingSetting;
        branding = {
          brandName: data.brandName || branding.brandName,
          brandTagline: data.brandTagline || branding.brandTagline,
          brandLogoUrl: data.brandLogoUrl || "",
        };
      }
    } catch {
      // keep fallback values when schema is still being prepared
    }
  }

  return (
    <main className="page-bg text-white">
      <div className="mx-auto min-h-[calc(100vh-64px)] max-w-6xl px-4 py-10 sm:px-6">
        <div className="card rounded-3xl p-6 sm:p-8">
          <p className="text-sm uppercase tracking-[0.2em] text-white/60">Admin</p>
          <h1 className="font-display mt-3 text-3xl font-semibold">Configurações</h1>
          <p className="mt-2 text-sm text-white/70">Estado da instalação do painel.</p>
        </div>

        <section className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="card rounded-2xl p-5">
            <p className="text-sm text-white/60">Sessão actual</p>
            <p className="mt-2 text-lg font-semibold">{session.email}</p>
          </div>
          <div className="card rounded-2xl p-5">
            <p className="text-sm text-white/60">Autenticação admin</p>
            <p className="mt-2 text-lg font-semibold">{authConfigured ? "Configurada" : "Pendente"}</p>
          </div>
          <div className="card rounded-2xl p-5">
            <p className="text-sm text-white/60">Base de dados</p>
            <p className="mt-2 text-lg font-semibold">{dbConfigured ? "Configurada" : "Pendente"}</p>
          </div>
          <div className="card rounded-2xl p-5">
            <p className="text-sm text-white/60">Utilizadores (PostgreSQL)</p>
            <p className="mt-2 text-lg font-semibold">{usersCount}</p>
          </div>
          <div className="card rounded-2xl p-5">
            <p className="text-sm text-white/60">Serviços (PostgreSQL)</p>
            <p className="mt-2 text-lg font-semibold">{servicesCount}</p>
          </div>
          <div className="card rounded-2xl p-5">
            <p className="text-sm text-white/60">Projectos (PostgreSQL)</p>
            <p className="mt-2 text-lg font-semibold">{projectsCount}</p>
          </div>
          <div className="card rounded-2xl p-5">
            <p className="text-sm text-white/60">Mensagens (PostgreSQL)</p>
            <p className="mt-2 text-lg font-semibold">{messagesCount}</p>
          </div>
          <div className="card rounded-2xl p-5">
            <p className="text-sm text-white/60">Conteúdos (schema)</p>
            <p className="mt-2 text-lg font-semibold">{contentTablesReady ? "OK" : "Pendente"}</p>
          </div>
          <div className="card rounded-2xl p-5">
            <p className="text-sm text-white/60">Configurações (PostgreSQL)</p>
            <p className="mt-2 text-lg font-semibold">{settingsCount}</p>
          </div>
        </section>

        <section className="mt-6 card rounded-3xl p-6 sm:p-8">
          <h2 className="font-display text-2xl font-semibold">Branding da Navbar</h2>
          <p className="mt-2 text-sm text-white/70">
            Actualize logótipo, nome e subtítulo exibidos no topo do site.
          </p>

          <form action={updateBrandingSettingsAction} className="mt-5 grid gap-3 text-sm">
            <label className="grid gap-2">
              Nome da marca
              <input
                className="h-11 rounded-xl border border-white/10 bg-[#0b0f1a] px-4"
                name="brand_name"
                defaultValue={branding.brandName}
              />
            </label>
            <label className="grid gap-2">
              Subtítulo
              <input
                className="h-11 rounded-xl border border-white/10 bg-[#0b0f1a] px-4"
                name="brand_tagline"
                defaultValue={branding.brandTagline}
              />
            </label>
            <label className="grid gap-2">
              Logótipo (upload)
              <input
                className="h-11 rounded-xl border border-white/10 bg-[#0b0f1a] px-4 file:mr-3 file:rounded-md file:border-0 file:bg-white/10 file:px-3 file:py-1.5"
                name="brand_logo_file"
                type="file"
                accept="image/*"
              />
            </label>
            <label className="grid gap-2">
              Logótipo URL
              <input
                className="h-11 rounded-xl border border-white/10 bg-[#0b0f1a] px-4"
                name="brand_logo_url"
                defaultValue={branding.brandLogoUrl}
              />
            </label>
            {branding.brandLogoUrl ? (
              <img
                src={branding.brandLogoUrl}
                alt="Pré-visualização do logótipo"
                className="h-16 w-fit rounded-lg border border-white/10 bg-white/5 object-contain px-2 py-1"
              />
            ) : null}
            <button className="btn-primary w-fit" type="submit">
              Guardar branding
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}

