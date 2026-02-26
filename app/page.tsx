import { dbQuery, isDatabaseConfigured } from "@/lib/db/postgres";
import {
  defaultContact,
  defaultHero,
  defaultHeroStats,
  defaultProjects,
  defaultProjectsSection,
  defaultServices,
  defaultServicesSection,
  defaultTestimonials,
  defaultTestimonialsSection,
} from "@/lib/content/defaults";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import Services from "./components/Services";
import ProfileHighlight from "./components/ProfileHighlight";
import Footer from "./components/Footer";
import ProjectsGallery from "./components/ProjectsGallery";

type HeroContentRow = {
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

type HeroStatRow = {
  value: string | null;
  label: string | null;
};

type ServicesSectionRow = {
  eyebrow: string | null;
  title: string | null;
  description: string | null;
};

type ServiceRow = {
  id: number;
  icon: string | null;
  title: string | null;
  image_url?: string | null;
  description: string | null;
};

type ProjectsSectionRow = {
  eyebrow: string | null;
  title: string | null;
  description: string | null;
};

type ProjectRow = {
  id: number;
  title: string | null;
  tag: string | null;
  image_url?: string | null;
  description: string | null;
};

type ProjectImageRow = {
  id: number;
  project_id: number;
  image_url: string | null;
  sort_order: number | null;
};

type TestimonialsSectionRow = {
  eyebrow: string | null;
  title: string | null;
  description: string | null;
};

type TestimonialRow = {
  id: number;
  name: string | null;
  role: string | null;
  quote: string | null;
};

type ContactSectionRow = {
  eyebrow: string | null;
  title: string | null;
  description: string | null;
  badges: string[] | null;
};

type ServiceIcon = "globe" | "cpu" | "shield" | "camera" | "layers" | "sparkles";

const validServiceIcons = new Set<ServiceIcon>([
  "globe",
  "cpu",
  "shield",
  "camera",
  "layers",
  "sparkles",
]);

function toServiceIcon(icon: string | null | undefined): ServiceIcon {
  return icon && validServiceIcons.has(icon as ServiceIcon)
    ? (icon as ServiceIcon)
    : "globe";
}

export default async function Home() {
  let heroData: HeroContentRow | null = null;
  let heroStatsData: HeroStatRow[] = [];
  let servicesSectionData: ServicesSectionRow | null = null;
  let servicesData: ServiceRow[] = [];
  let projectsSectionData: ProjectsSectionRow | null = null;
  let projectsData: ProjectRow[] = [];
  let projectImagesData: ProjectImageRow[] = [];
  let testimonialsSectionData: TestimonialsSectionRow | null = null;
  let testimonialsData: TestimonialRow[] = [];
  let contactData: ContactSectionRow | null = null;

  if (isDatabaseConfigured()) {
    try {
      await dbQuery(
        `create table if not exists project_images (
          id bigserial primary key,
          project_id int not null references projects(id) on delete cascade,
          image_url text not null,
          sort_order int not null default 0,
          created_at timestamptz not null default now()
        )`
      );

      const [
        heroResult,
        heroStatsResult,
        servicesResult,
        servicesSectionResult,
        projectsResult,
        projectImagesResult,
        projectsSectionResult,
        testimonialsResult,
        testimonialsSectionResult,
        contactResult,
      ] = await Promise.all([
        dbQuery<HeroContentRow>("select * from hero_content where id = 1"),
        dbQuery<HeroStatRow>("select * from hero_stats order by sort_order asc"),
        dbQuery<ServiceRow>("select * from services order by sort_order asc"),
        dbQuery<ServicesSectionRow>("select * from services_section where id = 1"),
        dbQuery<ProjectRow>("select * from projects order by sort_order asc"),
        dbQuery<ProjectImageRow>("select id, project_id, image_url, sort_order from project_images order by sort_order asc, id asc"),
        dbQuery<ProjectsSectionRow>("select * from projects_section where id = 1"),
        dbQuery<TestimonialRow>("select * from testimonials order by sort_order asc"),
        dbQuery<TestimonialsSectionRow>("select * from testimonials_section where id = 1"),
        dbQuery<ContactSectionRow>("select * from contact_section where id = 1"),
      ]);

      heroData = heroResult.rows[0] ?? null;
      heroStatsData = heroStatsResult.rows;
      servicesData = servicesResult.rows;
      servicesSectionData = servicesSectionResult.rows[0] ?? null;
      projectsData = projectsResult.rows;
      projectImagesData = projectImagesResult.rows;
      projectsSectionData = projectsSectionResult.rows[0] ?? null;
      testimonialsData = testimonialsResult.rows;
      testimonialsSectionData = testimonialsSectionResult.rows[0] ?? null;
      contactData = contactResult.rows[0] ?? null;
    } catch {
      // Keep fallback content if database or tables are not ready yet.
    }
  }

  const hero = heroData
    ? {
        badge: heroData.badge ?? defaultHero.badge,
        title: heroData.title ?? defaultHero.title,
        subtitle: heroData.subtitle ?? defaultHero.subtitle,
        radarEyebrow: heroData.radar_eyebrow ?? defaultHero.radarEyebrow,
        radarTitle: heroData.radar_title ?? defaultHero.radarTitle,
        radarDescription: heroData.radar_description ?? defaultHero.radarDescription,
        ctaPrimaryLabel: heroData.cta_primary_label ?? defaultHero.ctaPrimaryLabel,
        ctaPrimaryHref: heroData.cta_primary_href ?? defaultHero.ctaPrimaryHref,
        ctaSecondaryLabel:
          heroData.cta_secondary_label ?? defaultHero.ctaSecondaryLabel,
        ctaSecondaryHref:
          heroData.cta_secondary_href ?? defaultHero.ctaSecondaryHref,
      }
    : defaultHero;

  const heroStats =
    heroStatsData.length > 0
      ? heroStatsData.map((stat) => ({
          value: stat.value ?? "",
          label: stat.label ?? "",
        }))
      : defaultHeroStats;

  const servicesSection = servicesSectionData
    ? {
        eyebrow: servicesSectionData.eyebrow ?? defaultServicesSection.eyebrow,
        title: servicesSectionData.title ?? defaultServicesSection.title,
        description:
          servicesSectionData.description ?? defaultServicesSection.description,
      }
    : defaultServicesSection;

  const defaultServiceItems = defaultServices.map((service, index) => ({
    id: index + 1,
    icon: toServiceIcon(service.icon),
    title: service.title,
    imageUrl: (service as { imageUrl?: string }).imageUrl ?? "",
    description: service.description,
    sortOrder: index,
  }));

  const dbServiceItems = servicesData.map((service, index) => ({
    id: service.id,
    icon: toServiceIcon(service.icon),
    title: service.title ?? "",
    imageUrl: service.image_url ?? "",
    description: service.description ?? "",
    sortOrder: index,
  }));

  const dbServicesById = new Map(dbServiceItems.map((service) => [service.id, service]));
  const customServices = dbServiceItems.filter(
    (service) => !defaultServiceItems.some((item) => item.id === service.id)
  );

  const services = [...defaultServiceItems, ...customServices]
    .map((service) => dbServicesById.get(service.id) ?? service)
    .map(({ sortOrder: _sortOrder, ...service }) => service);

  const projectsSection = projectsSectionData
    ? {
        eyebrow: projectsSectionData.eyebrow ?? defaultProjectsSection.eyebrow,
        title: projectsSectionData.title ?? defaultProjectsSection.title,
        description:
          projectsSectionData.description ?? defaultProjectsSection.description,
      }
    : defaultProjectsSection;

  const projects =
    projectsData.length > 0
      ? projectsData.map((project) => ({
          id: project.id,
          title: project.title ?? "",
          tag: project.tag ?? "",
          imageUrl: project.image_url ?? "",
          galleryImages: projectImagesData
            .filter((item) => item.project_id === project.id)
            .map((item) => item.image_url ?? "")
            .filter(Boolean),
          description: project.description ?? "",
        }))
      : defaultProjects.map((project, index) => ({
          id: index + 1,
          ...project,
          imageUrl: (project as { imageUrl?: string }).imageUrl ?? "",
          galleryImages: (project as { galleryImages?: string[] }).galleryImages ?? [],
        }));

  const testimonialsSection = testimonialsSectionData
    ? {
        eyebrow:
          testimonialsSectionData.eyebrow ??
          defaultTestimonialsSection.eyebrow,
        title:
          testimonialsSectionData.title ?? defaultTestimonialsSection.title,
        description:
          testimonialsSectionData.description ??
          defaultTestimonialsSection.description,
      }
    : defaultTestimonialsSection;

  const testimonials =
    testimonialsData.length > 0
      ? testimonialsData.map((testimonial) => ({
          id: testimonial.id,
          name: testimonial.name ?? "",
          role: testimonial.role ?? "",
          quote: testimonial.quote ?? "",
        }))
      : defaultTestimonials;

  const contact = contactData
    ? {
        eyebrow: contactData.eyebrow ?? defaultContact.eyebrow,
        title: contactData.title ?? defaultContact.title,
        description: contactData.description ?? defaultContact.description,
        badges: Array.isArray(contactData.badges)
          ? contactData.badges
          : defaultContact.badges,
      }
    : defaultContact;

  return (
    <>
      <Navbar />
      <main className="page-bg text-white">
      <Hero
        badge={hero.badge}
        title={hero.title}
        subtitle={hero.subtitle}
        radarEyebrow={hero.radarEyebrow}
        radarTitle={hero.radarTitle}
        radarDescription={hero.radarDescription}
        ctaPrimaryLabel={hero.ctaPrimaryLabel}
        ctaPrimaryHref={hero.ctaPrimaryHref}
        ctaSecondaryLabel={hero.ctaSecondaryLabel}
        ctaSecondaryHref={hero.ctaSecondaryHref}
        stats={heroStats}
      />

      <Services
        eyebrow={servicesSection.eyebrow}
        title={servicesSection.title}
        description={servicesSection.description}
        items={services}
      />

      <section id="projectos" className="px-4 pb-12 pt-2 sm:px-6 sm:pb-16 sm:pt-4">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-white/60">
                {projectsSection.eyebrow}
              </p>
              <h2 className="section-title font-display mt-3">
                {projectsSection.title}
              </h2>
            </div>
            <p className="max-w-md text-sm text-white/65">
              {projectsSection.description}
            </p>
          </div>

          <ProjectsGallery items={projects} />
        </div>
      </section>

      <section className="px-4 pb-12 sm:px-6 sm:pb-16">
        <div className="mx-auto grid max-w-6xl gap-10 rounded-3xl border border-white/10 bg-[#0c1426]/80 p-6 sm:p-8 lg:p-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-white/60">
              Processo
            </p>
            <h2 className="section-title font-display mt-3">
              Clareza, velocidade e visão estratégica
            </h2>
            <p className="mt-4 text-sm text-white/70">
              Trabalhamos com sprints curtas, comunicação aberta e entregas
              previsíveis para a sua equipa ter confiança em cada etapa.
            </p>
            <div className="mt-6 grid gap-3 text-sm text-white/70">
              <div className="flex items-center gap-3">
                <span className="badge">01</span>
                <p>Diagnóstico e entendimento profundo do negócio.</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="badge">02</span>
                <p>Planeamento visual e técnico orientado a metas.</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="badge">03</span>
                <p>Implementação com testes, análises e ajustes.</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="badge">04</span>
                <p>Evolução contínua com suporte estratégico.</p>
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            {[
              {
                title: "Tempo de resposta",
                value: "Até 48h",
                description:
                  "Retorno com proposta clara e cronograma realista.",
              },
              {
                title: "Visão de produto",
                value: "Roadmap vivo",
                description:
                  "Priorização contínua para lançar mais rápido.",
              },
              {
                title: "Monitorização",
                value: "KPIs reais",
                description:
                  "Métricas para decisões de negócio mais seguras.",
              },
            ].map((item) => (
              <div key={item.title} className="card rounded-2xl p-6">
                <p className="text-xs uppercase tracking-[0.2em] text-white/60">
                  {item.title}
                </p>
                <h3 className="mt-3 text-xl font-semibold">{item.value}</h3>
                <p className="mt-2 text-sm text-white/70">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <ProfileHighlight />

      <section className="px-4 pb-12 sm:px-6 sm:pb-16">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-white/60">
                {testimonialsSection.eyebrow}
              </p>
              <h2 className="section-title font-display mt-3">
                {testimonialsSection.title}
              </h2>
            </div>
            <p className="max-w-md text-sm text-white/65">
              {testimonialsSection.description}
            </p>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {testimonials.map((testimonial) => (
              <div key={testimonial.name} className="card rounded-2xl p-6">
                <p className="text-sm text-white/70">
                  &ldquo;{testimonial.quote}&rdquo;
                </p>
                <div className="mt-6">
                  <p className="font-semibold">{testimonial.name}</p>
                  <p className="text-xs text-white/60">{testimonial.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer
        eyebrow={contact.eyebrow}
        title={contact.title}
        description={contact.description}
        badges={contact.badges}
      />
      </main>
    </>
  );
}




