"use client";

import { useEffect, useState } from "react";

type NavbarClientProps = {
  email: string | null;
  brandName: string;
  brandTagline: string;
  brandLogoUrl?: string;
};

const sections = ["inicio", "servicos", "projectos", "contacto"] as const;
type SectionId = (typeof sections)[number];

const sectionLabels: Record<SectionId, string> = {
  inicio: "Inicio",
  servicos: "Servicos",
  projectos: "Projectos",
  contacto: "Contacto",
};

const activationDelay: Record<SectionId, number> = {
  inicio: 0,
  servicos: 180,
  projectos: 120,
  contacto: 80,
};

export default function NavbarClient({
  email,
  brandName,
  brandTagline,
  brandLogoUrl = "",
}: NavbarClientProps) {
  const [activeSection, setActiveSection] = useState<SectionId>("inicio");
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const resolvedLogoUrl = (brandLogoUrl || "/logo-navbar.png").trim();

  const handleNavClick = (section: SectionId) => {
    setActiveSection(section);
    setIsMenuOpen(false);
  };

  useEffect(() => {
    const getTop = (id: SectionId) => {
      const el = document.getElementById(id);
      if (!el) {
        return Number.POSITIVE_INFINITY;
      }
      return el.getBoundingClientRect().top + window.scrollY;
    };

    const updateActiveSection = () => {
      const probeY = window.scrollY + 120;
      const servicesTop = getTop("servicos") + activationDelay.servicos;
      const projectsTop = getTop("projectos") + activationDelay.projectos;
      const contactTop = getTop("contacto") + activationDelay.contacto;

      let next: SectionId = "inicio";
      if (probeY >= contactTop) {
        next = "contacto";
      } else if (probeY >= projectsTop) {
        next = "projectos";
      } else if (probeY >= servicesTop) {
        next = "servicos";
      }

      setActiveSection(next);
    };

    updateActiveSection();
    window.addEventListener("scroll", updateActiveSection, { passive: true });
    window.addEventListener("resize", updateActiveSection);
    const handleHashChange = () => {
      window.setTimeout(updateActiveSection, 0);
    };

    window.addEventListener("hashchange", handleHashChange);

    return () => {
      window.removeEventListener("scroll", updateActiveSection);
      window.removeEventListener("resize", updateActiveSection);
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, []);

  return (
    <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#0b0f1a]/80 backdrop-blur-lg">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-2 sm:px-6 sm:py-3">
        <div className="flex items-center">
          <img
            src={resolvedLogoUrl}
            alt={`Logotipo ${brandName}`}
            className="h-10 w-auto max-w-[280px] object-contain sm:h-14 sm:max-w-[420px]"
          />
        </div>

        <div className="hidden items-center gap-6 text-sm text-white/80 md:flex">
          {sections.map((section) => (
            <a
              key={section}
              className={`nav-link ${activeSection === section ? "nav-link--active" : ""}`}
              href={`#${section}`}
              onClick={() => handleNavClick(section)}
            >
              {sectionLabels[section]}
            </a>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3 md:flex-nowrap">
          {email ? (
            <span className="badge hidden text-xs text-white/80 sm:inline-flex">
              Sessao iniciada: {email}
            </span>
          ) : null}
          <a className="btn-ghost text-sm" href="/admin/login">
            Painel de administracao
          </a>
          <a className="btn-primary text-sm" href="#contacto">
            Falar com a equipa
          </a>
          <button
            className="btn-ghost text-sm md:hidden"
            type="button"
            aria-expanded={isMenuOpen}
            aria-controls="mobile-nav"
            onClick={() => setIsMenuOpen((value) => !value)}
          >
            Menu
          </button>
        </div>
      </div>

      <div className={`md:hidden ${isMenuOpen ? "block" : "hidden"}`}>
        <div
          id="mobile-nav"
          className="mx-auto flex max-w-6xl flex-col gap-3 px-4 pb-4 text-sm text-white/80 sm:px-6"
        >
          {sections.map((section) => (
            <a
              key={section}
              className={`nav-link ${activeSection === section ? "nav-link--active" : ""}`}
              href={`#${section}`}
              onClick={() => handleNavClick(section)}
            >
              {sectionLabels[section]}
            </a>
          ))}
        </div>
      </div>
    </nav>
  );
}
