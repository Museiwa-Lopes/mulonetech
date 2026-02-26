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
  inicio: "Início",
  servicos: "Serviços",
  projectos: "Projectos",
  contacto: "Contacto",
};

// Delay activation so the highlight changes only when the user is truly inside each section.
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
      // Let browser finish hash scroll first.
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
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-[linear-gradient(120deg,#ffc164,#ff8bb5)]">
            {brandLogoUrl ? (
              <img
                src={brandLogoUrl}
                alt={`Logótipo ${brandName}`}
                className="h-full w-full object-cover"
              />
            ) : null}
          </div>
          <div>
            <p className="font-display text-lg font-semibold tracking-tight">{brandName}</p>
            <p className="text-xs text-white/60">{brandTagline}</p>
          </div>
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
              Sessão iniciada: {email}
            </span>
          ) : null}
          <a className="btn-ghost text-sm" href="/admin/login">
            Painel de administração
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
