import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth/admin";
import { dbQuery, isDatabaseConfigured } from "@/lib/db/postgres";
import {
  addProjectAction,
  deleteProjectImageAction,
  deleteProjectAction,
  updateProjectsAction,
  updateProjectsSectionAction,
} from "../actions";
import { defaultProjects, defaultProjectsSection } from "@/lib/content/defaults";

type Project = {
  id: number;
  title: string | null;
  tag: string | null;
  image_url?: string | null;
  description: string | null;
  sort_order: number | null;
};

type ProjectImage = {
  id: number;
  project_id: number;
  image_url: string;
  sort_order: number | null;
};

type ProjectsSection = {
  eyebrow: string | null;
  title: string | null;
  description: string | null;
};

export default async function AdminProjectsPage() {
  const session = await getAdminSession();
  if (!session) {
    redirect("/admin/login");
  }

  const hasDatabase = isDatabaseConfigured();
  let projects: Project[] = [];
  let projectsSection: ProjectsSection | null = null;
  let projectImages: ProjectImage[] = [];

  if (hasDatabase) {
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

      const [projectsResult, sectionResult, imagesResult] = await Promise.all([
        dbQuery<Project>("select * from projects order by sort_order asc"),
        dbQuery<ProjectsSection>("select * from projects_section where id = 1"),
        dbQuery<ProjectImage>("select * from project_images order by sort_order asc, id asc"),
      ]);
      projects = projectsResult.rows;
      projectsSection = sectionResult.rows[0] ?? null;
      projectImages = imagesResult.rows;
    } catch {
      // keep defaults if table is missing
    }
  }

  const mergedProjects =
    projects.length > 0
      ? projects.map((project) => ({
          id: project.id,
          title: project.title ?? "",
          tag: project.tag ?? "",
          image_url: project.image_url ?? "",
          description: project.description ?? "",
          sort_order: project.sort_order ?? 0,
        }))
      : defaultProjects.map((project, index) => ({
          id: index + 1,
          title: project.title,
          tag: project.tag,
          image_url: (project as { imageUrl?: string }).imageUrl ?? "",
          description: project.description,
          sort_order: index,
        }));

  const mergedProjectsSection = projectsSection
    ? {
        eyebrow: projectsSection.eyebrow ?? defaultProjectsSection.eyebrow,
        title: projectsSection.title ?? defaultProjectsSection.title,
        description: projectsSection.description ?? defaultProjectsSection.description,
      }
    : defaultProjectsSection;

  return (
    <main className="page-bg text-white">
      <div className="mx-auto min-h-[calc(100vh-64px)] max-w-6xl px-4 py-10 sm:px-6">
        <div className="card rounded-3xl p-6 sm:p-8">
          <p className="text-sm uppercase tracking-[0.2em] text-white/60">Admin</p>
          <h1 className="font-display mt-3 text-3xl font-semibold">Projectos</h1>
          <p className="mt-2 text-sm text-white/70">Gerir secção e cartões de projectos.</p>
          {!hasDatabase ? (
            <p className="mt-3 text-sm text-[#ff8bb5]">
              PostgreSQL não configurado. Defina `DATABASE_URL`.
            </p>
          ) : null}
        </div>

        <section className="mt-6 grid gap-5 lg:grid-cols-2">
          <div className="card rounded-3xl p-6 sm:p-7">
            <h2 className="font-display text-xl font-semibold">Secção Projectos</h2>
            <form action={updateProjectsSectionAction} className="mt-5 grid gap-3 text-sm">
              <label className="grid gap-2">
                Eyebrow
                <input
                  className="h-11 rounded-xl border border-white/10 bg-[#0b0f1a] px-4"
                  name="projects_eyebrow"
                  defaultValue={mergedProjectsSection.eyebrow}
                />
              </label>
              <label className="grid gap-2">
                Título
                <input
                  className="h-11 rounded-xl border border-white/10 bg-[#0b0f1a] px-4"
                  name="projects_title"
                  defaultValue={mergedProjectsSection.title}
                />
              </label>
              <label className="grid gap-2">
                Descrição
                <textarea
                  className="min-h-[120px] rounded-xl border border-white/10 bg-[#0b0f1a] px-4 py-3"
                  name="projects_description"
                  defaultValue={mergedProjectsSection.description}
                />
              </label>
              <button className="btn-primary w-full" type="submit">
                Guardar secção
              </button>
            </form>
          </div>

          <div className="card rounded-3xl p-6 sm:p-7">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-xl font-semibold">Cartões de Projectos</h2>
              <form action={addProjectAction}>
                <button className="btn-ghost text-xs" type="submit">
                  + Adicionar projecto
                </button>
              </form>
            </div>
            <div className="mt-5 grid gap-4 text-sm">
              {mergedProjects.map((project, index) => (
                <form
                  key={project.id}
                  action={updateProjectsAction}
                  className="grid gap-3 rounded-2xl border border-white/10 p-4"
                >
                  <input type="hidden" name="projects_count" value={1} />
                  <input type="hidden" name="projects_id_0" value={project.id} />
                  <input type="hidden" name="projects_order_0" value={project.sort_order} />
                  <label className="grid gap-2">
                    Tag
                    <input
                      className="h-11 rounded-xl border border-white/10 bg-[#0b0f1a] px-4"
                      name="projects_tag_0"
                      defaultValue={project.tag}
                    />
                  </label>
                  <label className="grid gap-2">
                    Título
                    <input
                      className="h-11 rounded-xl border border-white/10 bg-[#0b0f1a] px-4"
                      name="projects_title_0"
                      defaultValue={project.title}
                    />
                  </label>
                  <label className="grid gap-2">
                    Fotografia (upload)
                    <input
                      className="h-11 rounded-xl border border-white/10 bg-[#0b0f1a] px-4 file:mr-3 file:rounded-md file:border-0 file:bg-white/10 file:px-3 file:py-1.5"
                      name="projects_image_file_0"
                      type="file"
                      accept="image/*"
                    />
                  </label>
                  <label className="grid gap-2">
                    Galeria do projecto (várias fotografias)
                    <input
                      className="h-11 rounded-xl border border-white/10 bg-[#0b0f1a] px-4 file:mr-3 file:rounded-md file:border-0 file:bg-white/10 file:px-3 file:py-1.5"
                      name="projects_images_files_0"
                      type="file"
                      multiple
                      accept="image/*"
                    />
                  </label>
                  <label className="grid gap-2">
                    Fotografia URL
                    <input
                      className="h-11 rounded-xl border border-white/10 bg-[#0b0f1a] px-4"
                      name="projects_image_url_0"
                      defaultValue={project.image_url}
                    />
                  </label>
                  {project.image_url ? (
                    <img
                      src={project.image_url}
                      alt={`Preview de ${project.title || `projecto ${index + 1}`}`}
                      className="h-28 w-full rounded-xl border border-white/10 object-cover"
                    />
                  ) : null}
                  <label className="grid gap-2">
                    Descrição
                    <textarea
                      className="min-h-[100px] rounded-xl border border-white/10 bg-[#0b0f1a] px-4 py-3"
                      name="projects_description_0"
                      defaultValue={project.description}
                    />
                  </label>
                  <button className="btn-primary w-full" type="submit">
                    Guardar projecto
                  </button>
                  {projectImages.filter((item) => item.project_id === project.id).length > 0 ? (
                    <div className="grid gap-2">
                      <p className="text-xs text-white/60">Galeria actual</p>
                      <div className="grid grid-cols-3 gap-2">
                        {projectImages
                          .filter((item) => item.project_id === project.id)
                          .map((item) => (
                            <div key={item.id} className="relative">
                              <img
                                src={item.image_url}
                                alt={`Galeria de ${project.title || "projecto"}`}
                                className="h-20 w-full rounded-lg border border-white/10 object-cover"
                              />
                              <button
                                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full border border-white/30 bg-black/60 text-xs text-white hover:bg-[#ff8bb5]/80"
                                type="submit"
                                formAction={deleteProjectImageAction.bind(null, item.id, project.id)}
                                aria-label="Remover fotografia"
                                title="Remover fotografia"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                      </div>
                    </div>
                  ) : null}
                  <button
                    className="btn-ghost w-full text-xs text-[#ff8bb5]"
                    type="submit"
                    formAction={deleteProjectAction.bind(null, project.id)}
                  >
                    Remover projecto
                  </button>
                </form>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}


