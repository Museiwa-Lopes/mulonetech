type HeroStat = {
  value: string;
  label: string;
};

type HeroProps = {
  badge: string;
  title: string;
  subtitle: string;
  radarEyebrow: string;
  radarTitle: string;
  radarDescription: string;
  ctaPrimaryLabel: string;
  ctaPrimaryHref: string;
  ctaSecondaryLabel: string;
  ctaSecondaryHref: string;
  stats: HeroStat[];
};

export default function Hero({
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
  stats,
}: HeroProps) {
  const radarStats = stats.slice(0, 3).map((stat, index) => {
    const parsed = Number.parseInt(String(stat.value).replace(/[^\d]/g, ""), 10);
    const percentage = Number.isFinite(parsed)
      ? Math.max(0, Math.min(100, parsed))
      : [87, 92, 79][index] ?? 50;
    const color = ["#ffc164", "#8cf5d2", "#ff8bb5"][index] ?? "#ffc164";

    return {
      label: stat.label || `Indicador ${index + 1}`,
      percentage,
      color,
    };
  });

  return (
    <section
      id="inicio"
      className="relative overflow-hidden pb-12 pt-12 sm:pb-16 sm:pt-14"
    >
      <div className="pointer-events-none absolute inset-0 grid-overlay opacity-40" />
      <div className="absolute -right-20 top-12 h-56 w-56 rounded-full bg-[radial-gradient(circle_at_top,#8cf5d2,transparent_70%)] opacity-70 blur-2xl" />
      <div className="absolute -left-24 top-32 h-64 w-64 rounded-full bg-[radial-gradient(circle_at_top,#ff8bb5,transparent_70%)] opacity-60 blur-2xl" />

      <div className="mx-auto grid max-w-6xl items-start gap-8 px-4 sm:gap-10 sm:px-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="animate-fade-up">
          <div className="badge w-fit text-xs text-white/80 sm:text-sm">
            {badge}
          </div>
          <h1 className="font-display mt-5 text-3xl font-semibold leading-tight sm:text-4xl md:text-5xl lg:text-6xl">
            {title}
          </h1>
          <p className="mt-4 text-base text-white/70 sm:text-lg">{subtitle}</p>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <a
              className="btn-primary w-full text-center sm:w-auto"
              href={ctaPrimaryHref}
            >
              {ctaPrimaryLabel}
            </a>
            <a
              className="btn-ghost w-full text-center sm:w-auto"
              href={ctaSecondaryHref}
            >
              {ctaSecondaryLabel}
            </a>
          </div>
          <div className="mt-8 grid gap-5 text-sm text-white/70 sm:flex sm:flex-wrap">
            {stats.map((stat) => (
              <div key={`${stat.value}-${stat.label}`}>
                <p className="text-lg font-semibold text-white">{stat.value}</p>
                <p>{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative flex justify-center lg:justify-end">
          <div className="w-full max-w-sm space-y-4">
            <div className="card animate-float rounded-3xl p-6">
              <p className="text-sm text-white/60">{radarEyebrow}</p>
              <h3 className="font-display mt-3 text-2xl font-semibold">{radarTitle}</h3>
              <p className="mt-4 text-sm text-white/70">{radarDescription}</p>
              <div className="mt-6 grid gap-4 text-sm text-white/75">
                {radarStats.map((item) => (
                  <div key={item.label} className="grid gap-2">
                    <div className="flex items-center justify-between">
                      <span>{item.label}</span>
                      <span className="text-white">{item.percentage}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${item.percentage}%`, backgroundColor: item.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#0c1222]/70 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-white/55">
                Contacto rápido
              </p>
              <p className="mt-2 text-sm text-white/80">CEO: Museiwa Lopes</p>
              <div className="mt-3 grid grid-cols-4 gap-2">
                <a
                  className="btn-ghost flex h-13 w-15 items-center justify-center p-0"
                  href="https://wa.me/258846461845"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="WhatsApp"
                >
                  <i className="fa-brands fa-whatsapp text-lg" aria-hidden="true" />
                </a>
                <a
                  className="btn-ghost flex h-13 w-15 items-center justify-center p-0"
                  href="https://facebook.com/mulone.258"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Facebook"
                >
                  <i className="fa-brands fa-facebook-f text-lg" aria-hidden="true" />
                </a>
                <a
                  className="btn-ghost flex h-13 w-15 items-center justify-center p-0"
                  href="https://instagram.com/mulone.258"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Instagram"
                >
                  <i className="fa-brands fa-instagram text-lg" aria-hidden="true" />
                </a>
                <a
                  className="btn-ghost flex h-13 w-15 items-center justify-center p-0"
                  href="https://www.linkedin.com/in/museiwa-lopes-37345a317"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="LinkedIn"
                >
                  <i className="fa-brands fa-linkedin-in text-lg" aria-hidden="true" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}




