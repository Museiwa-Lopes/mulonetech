"use client";

import { useEffect, useMemo, useState } from "react";

type ProjectItem = {
  id: number | string;
  title: string;
  tag: string;
  description: string;
  imageUrl?: string;
  galleryImages?: string[];
};

type ProjectsGalleryProps = {
  items: ProjectItem[];
};

type GalleryProject = ProjectItem & { images: string[] };

export default function ProjectsGallery({ items }: ProjectsGalleryProps) {
  const [openProjectId, setOpenProjectId] = useState<number | string | null>(null);
  const [openImageIndex, setOpenImageIndex] = useState(0);

  const galleryItems = useMemo<GalleryProject[]>(() => {
    return items
      .map((item) => {
        const list = (item.galleryImages ?? []).filter(Boolean);
        const images = list.length > 0 ? list : item.imageUrl ? [item.imageUrl] : [];
        return { ...item, images };
      })
      .filter((item) => item.images.length > 0);
  }, [items]);

  const activeProject = useMemo(() => {
    if (openProjectId === null) {
      return null;
    }
    return galleryItems.find((item) => item.id === openProjectId) ?? null;
  }, [galleryItems, openProjectId]);

  const activeImage = activeProject?.images[openImageIndex] ?? null;

  function openFromProject(projectId: number | string) {
    const item = galleryItems.find((project) => project.id === projectId);
    if (!item) {
      return;
    }
    setOpenProjectId(projectId);
    setOpenImageIndex(0);
  }

  function closeModal() {
    setOpenProjectId(null);
    setOpenImageIndex(0);
  }

  function goPrev() {
    if (!activeProject) {
      return;
    }
    setOpenImageIndex((openImageIndex - 1 + activeProject.images.length) % activeProject.images.length);
  }

  function goNext() {
    if (!activeProject) {
      return;
    }
    setOpenImageIndex((openImageIndex + 1) % activeProject.images.length);
  }

  useEffect(() => {
    if (!activeProject) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeModal();
      } else if (event.key === "ArrowLeft") {
        goPrev();
      } else if (event.key === "ArrowRight") {
        goNext();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [activeProject, openImageIndex]);

  return (
    <>
      <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {items.map((project) => (
          <div key={project.id} className="card rounded-2xl p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-white/50">{project.tag}</p>
            <h3 className="mt-4 text-xl font-semibold">{project.title}</h3>
            <p className="mt-3 text-sm text-white/70">{project.description}</p>
            <button
              className="group relative mt-6 block h-40 w-full overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(120deg,#1b233f,#0f172a)] text-left disabled:cursor-not-allowed"
              type="button"
              onClick={() => openFromProject(project.id)}
              disabled={!project.imageUrl && !(project.galleryImages?.length)}
              aria-label={`Ver galeria de ${project.title}`}
            >
              {project.imageUrl ? (
                <>
                  <img
                    src={project.imageUrl}
                    alt={`Fotografia do projecto ${project.title}`}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 transition group-hover:opacity-100" />
                </>
              ) : null}
            </button>
          </div>
        ))}
      </div>

      {activeProject && activeImage ? (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-[#04070fcc] p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={closeModal}
        >
          <div
            className="w-full max-w-5xl animate-fade-up rounded-2xl border border-white/10 bg-[#0b1020] p-4 sm:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-white/50">{activeProject.tag}</p>
                <h3 className="mt-1 text-xl font-semibold">{activeProject.title}</h3>
              </div>
              <button className="btn-ghost text-xs" type="button" onClick={closeModal}>
                Fechar
              </button>
            </div>

            <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
              <img
                src={activeImage}
                alt={`Imagem ampliada de ${activeProject.title}`}
                className="h-[60vh] w-full object-cover"
              />
            </div>

            <p className="mt-4 text-sm text-white/70">{activeProject.description}</p>

            <div className="mt-5 flex items-center justify-between gap-3">
              <button className="btn-ghost text-xs" type="button" onClick={goPrev}>
                &lt; Anterior
              </button>
              <p className="text-xs text-white/60">
                {openImageIndex + 1}/{activeProject.images.length}
              </p>
              <button className="btn-primary text-xs" type="button" onClick={goNext}>
                Próximo &gt;
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

