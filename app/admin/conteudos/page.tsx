import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth/admin";
import { dbQuery, isDatabaseConfigured } from "@/lib/db/postgres";
import {
  addTestimonialAction,
  deleteTestimonialAction,
  updateContactAction,
  updateHeroAction,
  updateHeroStatsAction,
  updateProfileAction,
  updateTestimonialsAction,
  updateTestimonialsSectionAction,
} from "../actions";
import {
  defaultContact,
  defaultHero,
  defaultHeroStats,
  defaultTestimonials,
  defaultTestimonialsSection,
} from "@/lib/content/defaults";

type Profile = {
  display_name: string | null;
  role: string | null;
  bio: string | null;
  avatar_url: string | null;
};

type HeroContent = {
  badge: string | null;
  title: string | null;
  subtitle: string | null;
  radar_eyebrow: string | null;
  radar_title: string | null;
  radar_description: string | null;
  cta_primary_label: string | null;
  cta_primary_href: string | null;
  cta_secondary_label: string | null;
  cta_secondary_href: string | null;
};

type HeroStat = {
  id: number;
  value: string | null;
  label: string | null;
  sort_order: number | null;
};

type TestimonialsSection = {
  eyebrow: string | null;
  title: string | null;
  description: string | null;
};

type Testimonial = {
  id: number;
  name: string | null;
  role: string | null;
  quote: string | null;
  sort_order: number | null;
};

type ContactSection = {
  eyebrow: string | null;
  title: string | null;
  description: string | null;
  badges: string[] | null;
};

export default async function AdminContentPage() {
  const session = await getAdminSession();
  if (!session) {
    redirect("/admin/login");
  }

  const hasDatabase = isDatabaseConfigured();
  let profile: Profile | null = null;
  let hero: HeroContent | null = null;
  let heroStats: HeroStat[] = [];
  let testimonialsSection: TestimonialsSection | null = null;
  let testimonials: Testimonial[] = [];
  let contact: ContactSection | null = null;

  if (hasDatabase) {
    try {
      await dbQuery("alter table hero_content add column if not exists radar_eyebrow text");
      await dbQuery("alter table hero_content add column if not exists radar_title text");
      await dbQuery("alter table hero_content add column if not exists radar_description text");
      const [profileResult, heroResult, heroStatsResult, tSectionResult, testimonialsResult, contactResult] =
        await Promise.all([
          dbQuery<Profile>("select display_name, role, bio, avatar_url from admin_profile where id = 1"),
          dbQuery<HeroContent>(
            `select badge, title, subtitle, cta_primary_label, cta_primary_href,
                    cta_secondary_label, cta_secondary_href,
                    radar_eyebrow, radar_title, radar_description
             from hero_content where id = 1`
          ),
          dbQuery<HeroStat>("select id, value, label, sort_order from hero_stats order by sort_order asc"),
          dbQuery<TestimonialsSection>("select eyebrow, title, description from testimonials_section where id = 1"),
          dbQuery<Testimonial>("select id, name, role, quote, sort_order from testimonials order by sort_order asc"),
          dbQuery<ContactSection>("select eyebrow, title, description, badges from contact_section where id = 1"),
        ]);

      profile = profileResult.rows[0] ?? null;
      hero = heroResult.rows[0] ?? null;
      heroStats = heroStatsResult.rows;
      testimonialsSection = tSectionResult.rows[0] ?? null;
      testimonials = testimonialsResult.rows;
      contact = contactResult.rows[0] ?? null;
    } catch {
      // keep defaults if tables are missing
    }
  }

  const mergedHero = {
    badge: hero?.badge ?? defaultHero.badge,
    title: hero?.title ?? defaultHero.title,
    subtitle: hero?.subtitle ?? defaultHero.subtitle,
    radarEyebrow: hero?.radar_eyebrow ?? defaultHero.radarEyebrow,
    radarTitle: hero?.radar_title ?? defaultHero.radarTitle,
    radarDescription: hero?.radar_description ?? defaultHero.radarDescription,
    ctaPrimaryLabel: hero?.cta_primary_label ?? defaultHero.ctaPrimaryLabel,
    ctaPrimaryHref: hero?.cta_primary_href ?? defaultHero.ctaPrimaryHref,
    ctaSecondaryLabel: hero?.cta_secondary_label ?? defaultHero.ctaSecondaryLabel,
    ctaSecondaryHref: hero?.cta_secondary_href ?? defaultHero.ctaSecondaryHref,
  };

  const mergedHeroStats =
    heroStats.length > 0
      ? heroStats.map((item, index) => ({
          id: item.id,
          value: item.value ?? "",
          label: item.label ?? "",
          sort_order: item.sort_order ?? index,
        }))
      : defaultHeroStats.map((item, index) => ({
          id: index + 1,
          value: item.value,
          label: item.label,
          sort_order: index,
        }));

  const mergedTestimonialsSection = testimonialsSection
    ? {
        eyebrow: testimonialsSection.eyebrow ?? defaultTestimonialsSection.eyebrow,
        title: testimonialsSection.title ?? defaultTestimonialsSection.title,
        description: testimonialsSection.description ?? defaultTestimonialsSection.description,
      }
    : defaultTestimonialsSection;

  const mergedTestimonials =
    testimonials.length > 0
      ? testimonials.map((item, index) => ({
          id: item.id,
          name: item.name ?? "",
          role: item.role ?? "",
          quote: item.quote ?? "",
          sort_order: item.sort_order ?? index,
        }))
      : defaultTestimonials.map((item, index) => ({
          id: index + 1,
          name: item.name,
          role: item.role,
          quote: item.quote,
          sort_order: index,
        }));

  const contactBadges = [0, 1, 2].map((index) => contact?.badges?.[index] ?? defaultContact.badges[index] ?? "");

  return (
    <main className="page-bg text-white">
      <div className="mx-auto min-h-[calc(100vh-64px)] max-w-6xl px-4 py-10 sm:px-6">
        <div className="card rounded-3xl p-6 sm:p-8">
          <p className="text-sm uppercase tracking-[0.2em] text-white/60">Admin</p>
          <h1 className="font-display mt-3 text-3xl font-semibold">Conteúdos</h1>
          <p className="mt-2 text-sm text-white/70">Editar textos e blocos principais do site.</p>
          {!hasDatabase ? (
            <p className="mt-3 text-sm text-[#ff8bb5]">
              PostgreSQL não configurado. Defina `DATABASE_URL`.
            </p>
          ) : null}
        </div>

        <section className="mt-6 grid gap-5 lg:grid-cols-2">
          <div className="card rounded-3xl p-6 sm:p-7">
            <h2 className="font-display text-xl font-semibold">Perfil institucional</h2>
            <form action={updateProfileAction} className="mt-5 grid gap-3 text-sm">
              <label className="grid gap-2">
                Nome
                <input
                  className="h-11 rounded-xl border border-white/10 bg-[#0b0f1a] px-4"
                  name="display_name"
                  defaultValue={profile?.display_name ?? ""}
                />
              </label>
              <label className="grid gap-2">
                Cargo
                <input
                  className="h-11 rounded-xl border border-white/10 bg-[#0b0f1a] px-4"
                  name="role"
                  defaultValue={profile?.role ?? ""}
                />
              </label>
              <label className="grid gap-2">
                Bio
                <textarea
                  className="min-h-[120px] rounded-xl border border-white/10 bg-[#0b0f1a] px-4 py-3"
                  name="bio"
                  defaultValue={profile?.bio ?? ""}
                />
              </label>
              <label className="grid gap-2">
                Foto URL
                <input
                  className="h-11 rounded-xl border border-white/10 bg-[#0b0f1a] px-4"
                  name="avatar_url"
                  defaultValue={profile?.avatar_url ?? ""}
                />
              </label>
              <label className="grid gap-2">
                Foto (upload)
                <input
                  className="h-11 rounded-xl border border-white/10 bg-[#0b0f1a] px-4 file:mr-3 file:rounded-md file:border-0 file:bg-white/10 file:px-3 file:py-1.5"
                  name="avatar_file"
                  type="file"
                  accept="image/*"
                />
              </label>
              <button className="btn-primary w-full" type="submit">
                Guardar perfil
              </button>
            </form>
          </div>

          <div className="card rounded-3xl p-6 sm:p-7">
            <h2 className="font-display text-xl font-semibold">Hero</h2>
            <form action={updateHeroAction} className="mt-5 grid gap-3 text-sm">
              <label className="grid gap-2">
                Badge
                <input
                  className="h-11 rounded-xl border border-white/10 bg-[#0b0f1a] px-4"
                  name="hero_badge"
                  defaultValue={mergedHero.badge}
                />
              </label>
              <label className="grid gap-2">
                Título
                <input
                  className="h-11 rounded-xl border border-white/10 bg-[#0b0f1a] px-4"
                  name="hero_title"
                  defaultValue={mergedHero.title}
                />
              </label>
              <label className="grid gap-2">
                Subtítulo
                <textarea
                  className="min-h-[100px] rounded-xl border border-white/10 bg-[#0b0f1a] px-4 py-3"
                  name="hero_subtitle"
                  defaultValue={mergedHero.subtitle}
                />
              </label>
              <label className="grid gap-2">
                Radar: Eyebrow
                <input
                  className="h-11 rounded-xl border border-white/10 bg-[#0b0f1a] px-4"
                  name="hero_radar_eyebrow"
                  defaultValue={mergedHero.radarEyebrow}
                />
              </label>
              <label className="grid gap-2">
                Radar: Título
                <input
                  className="h-11 rounded-xl border border-white/10 bg-[#0b0f1a] px-4"
                  name="hero_radar_title"
                  defaultValue={mergedHero.radarTitle}
                />
              </label>
              <label className="grid gap-2">
                Radar: Descrição
                <textarea
                  className="min-h-[100px] rounded-xl border border-white/10 bg-[#0b0f1a] px-4 py-3"
                  name="hero_radar_description"
                  defaultValue={mergedHero.radarDescription}
                />
              </label>
              <label className="grid gap-2">
                CTA primário (texto)
                <input
                  className="h-11 rounded-xl border border-white/10 bg-[#0b0f1a] px-4"
                  name="hero_cta_primary_label"
                  defaultValue={mergedHero.ctaPrimaryLabel}
                />
              </label>
              <label className="grid gap-2">
                CTA primário (link)
                <input
                  className="h-11 rounded-xl border border-white/10 bg-[#0b0f1a] px-4"
                  name="hero_cta_primary_href"
                  defaultValue={mergedHero.ctaPrimaryHref}
                />
              </label>
              <label className="grid gap-2">
                CTA secundário (texto)
                <input
                  className="h-11 rounded-xl border border-white/10 bg-[#0b0f1a] px-4"
                  name="hero_cta_secondary_label"
                  defaultValue={mergedHero.ctaSecondaryLabel}
                />
              </label>
              <label className="grid gap-2">
                CTA secundário (link)
                <input
                  className="h-11 rounded-xl border border-white/10 bg-[#0b0f1a] px-4"
                  name="hero_cta_secondary_href"
                  defaultValue={mergedHero.ctaSecondaryHref}
                />
              </label>
              <button className="btn-primary w-full" type="submit">
                Guardar hero
              </button>
            </form>
          </div>
        </section>

        <section className="mt-6 grid gap-5 lg:grid-cols-2">
          <div className="card rounded-3xl p-6 sm:p-7">
            <h2 className="font-display text-xl font-semibold">Estatísticas do hero</h2>
            <div className="mt-5 grid gap-4 text-sm">
              {mergedHeroStats.map((item) => (
                <form key={item.id} action={updateHeroStatsAction} className="grid gap-3">
                  <input type="hidden" name="hero_stats_count" value={1} />
                  <input type="hidden" name="hero_stats_id_0" value={item.id} />
                  <input type="hidden" name="hero_stats_order_0" value={item.sort_order} />
                  <label className="grid gap-2">
                    Valor
                    <input
                      className="h-11 rounded-xl border border-white/10 bg-[#0b0f1a] px-4"
                      name="hero_stats_value_0"
                      defaultValue={item.value}
                    />
                  </label>
                  <label className="grid gap-2">
                    Rótulo
                    <input
                      className="h-11 rounded-xl border border-white/10 bg-[#0b0f1a] px-4"
                      name="hero_stats_label_0"
                      defaultValue={item.label}
                    />
                  </label>
                  <button className="btn-primary w-full" type="submit">
                    Guardar estatística
                  </button>
                </form>
              ))}
            </div>
          </div>

          <div className="card rounded-3xl p-6 sm:p-7">
            <h2 className="font-display text-xl font-semibold">Secção Depoimentos</h2>
            <form action={updateTestimonialsSectionAction} className="mt-5 grid gap-3 text-sm">
              <label className="grid gap-2">
                Eyebrow
                <input
                  className="h-11 rounded-xl border border-white/10 bg-[#0b0f1a] px-4"
                  name="testimonials_eyebrow"
                  defaultValue={mergedTestimonialsSection.eyebrow}
                />
              </label>
              <label className="grid gap-2">
                Título
                <input
                  className="h-11 rounded-xl border border-white/10 bg-[#0b0f1a] px-4"
                  name="testimonials_title"
                  defaultValue={mergedTestimonialsSection.title}
                />
              </label>
              <label className="grid gap-2">
                Descrição
                <textarea
                  className="min-h-[120px] rounded-xl border border-white/10 bg-[#0b0f1a] px-4 py-3"
                  name="testimonials_description"
                  defaultValue={mergedTestimonialsSection.description}
                />
              </label>
              <button className="btn-primary w-full" type="submit">
                Guardar secção
              </button>
            </form>
          </div>
        </section>

        <section className="mt-6 grid gap-5 lg:grid-cols-2">
          <div className="card rounded-3xl p-6 sm:p-7">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-xl font-semibold">Depoimentos</h2>
              <form action={addTestimonialAction}>
                <button className="btn-ghost w-full text-xs" type="submit">
                  + Adicionar parceiro
                </button>
              </form>
            </div>
            <div className="mt-5 grid gap-4 text-sm">
              {mergedTestimonials.map((item) => (
                <form
                  key={item.id}
                  action={updateTestimonialsAction}
                  className="grid gap-3 rounded-2xl border border-white/10 p-4"
                >
                  <input type="hidden" name="testimonials_count" value={1} />
                  <input type="hidden" name="testimonials_id_0" value={item.id} />
                  <input type="hidden" name="testimonials_order_0" value={item.sort_order} />
                  <label className="grid gap-2">
                    Nome
                    <input
                      className="h-11 rounded-xl border border-white/10 bg-[#0b0f1a] px-4"
                      name="testimonials_name_0"
                      defaultValue={item.name}
                    />
                  </label>
                  <label className="grid gap-2">
                    Cargo
                    <input
                      className="h-11 rounded-xl border border-white/10 bg-[#0b0f1a] px-4"
                      name="testimonials_role_0"
                      defaultValue={item.role}
                    />
                  </label>
                  <label className="grid gap-2">
                    Citação
                    <textarea
                      className="min-h-[100px] rounded-xl border border-white/10 bg-[#0b0f1a] px-4 py-3"
                      name="testimonials_quote_0"
                      defaultValue={item.quote}
                    />
                  </label>
                  <button className="btn-primary w-full" type="submit">
                    Guardar depoimento
                  </button>
                  <button
                    className="btn-ghost w-full text-xs text-[#ff8bb5]"
                    type="submit"
                    formAction={deleteTestimonialAction.bind(null, item.id)}
                  >
                    Remover parceiro
                  </button>
                </form>
              ))}
            </div>
          </div>

          <div className="card rounded-3xl p-6 sm:p-7">
            <h2 className="font-display text-xl font-semibold">Contacto</h2>
            <form action={updateContactAction} className="mt-5 grid gap-3 text-sm">
              <label className="grid gap-2">
                Eyebrow
                <input
                  className="h-11 rounded-xl border border-white/10 bg-[#0b0f1a] px-4"
                  name="contact_eyebrow"
                  defaultValue={contact?.eyebrow ?? defaultContact.eyebrow}
                />
              </label>
              <label className="grid gap-2">
                Título
                <input
                  className="h-11 rounded-xl border border-white/10 bg-[#0b0f1a] px-4"
                  name="contact_title"
                  defaultValue={contact?.title ?? defaultContact.title}
                />
              </label>
              <label className="grid gap-2">
                Descrição
                <textarea
                  className="min-h-[120px] rounded-xl border border-white/10 bg-[#0b0f1a] px-4 py-3"
                  name="contact_description"
                  defaultValue={contact?.description ?? defaultContact.description}
                />
              </label>
              <label className="grid gap-2">
                Badge 1
                <input
                  className="h-11 rounded-xl border border-white/10 bg-[#0b0f1a] px-4"
                  name="contact_badge_0"
                  defaultValue={contactBadges[0]}
                />
              </label>
              <label className="grid gap-2">
                Badge 2
                <input
                  className="h-11 rounded-xl border border-white/10 bg-[#0b0f1a] px-4"
                  name="contact_badge_1"
                  defaultValue={contactBadges[1]}
                />
              </label>
              <label className="grid gap-2">
                Badge 3
                <input
                  className="h-11 rounded-xl border border-white/10 bg-[#0b0f1a] px-4"
                  name="contact_badge_2"
                  defaultValue={contactBadges[2]}
                />
              </label>
              <button className="btn-primary w-full" type="submit">
                Guardar contacto
              </button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}




