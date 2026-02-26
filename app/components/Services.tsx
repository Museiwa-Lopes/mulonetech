import { Globe, ShieldCheck, Camera, Cpu, Layers, Sparkles } from "lucide-react";

const iconMap = {
  globe: Globe,
  cpu: Cpu,
  shield: ShieldCheck,
  camera: Camera,
  layers: Layers,
  sparkles: Sparkles,
};

type ServiceItem = {
  id?: number;
  icon: keyof typeof iconMap;
  title: string;
  description: string;
  imageUrl?: string;
};

type ServicesProps = {
  eyebrow: string;
  title: string;
  description: string;
  items: ServiceItem[];
};

export default function Services({
  eyebrow,
  title,
  description,
  items,
}: ServicesProps) {
  return (
    <section id="servicos" className="px-4 pb-12 pt-2 sm:px-6 sm:pb-16 sm:pt-4">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-white/60">
              {eyebrow}
            </p>
            <h2 className="section-title font-display mt-3">{title}</h2>
          </div>
          <p className="max-w-md text-sm text-white/65">
            {description}
          </p>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {items.map((service) => {
            const Icon = iconMap[service.icon] ?? Globe;
            return (
              <div
                key={service.title}
                className="card group relative overflow-hidden rounded-2xl p-6"
              >
                <div className="pointer-events-none absolute inset-0 opacity-0 transition duration-300 group-hover:opacity-100">
                  <div className="absolute -right-10 -top-10 h-24 w-24 rounded-full bg-[radial-gradient(circle_at_top,#ffc164,transparent_70%)] opacity-70 blur-xl" />
                  <div className="absolute -left-8 bottom-0 h-24 w-24 rounded-full bg-[radial-gradient(circle_at_top,#8cf5d2,transparent_70%)] opacity-50 blur-xl" />
                </div>
                <div className="relative mb-5 h-40 overflow-hidden rounded-xl border border-white/10 bg-[linear-gradient(120deg,#1b233f,#0f172a)]">
                  {service.imageUrl ? (
                    <img
                      src={service.imageUrl}
                      alt={`Fotografia de ${service.title}`}
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                  <div className="absolute left-3 top-3 rounded-lg border border-white/15 bg-black/35 p-2 backdrop-blur">
                    <Icon size={22} className="text-[#ffc164]" />
                  </div>
                </div>
                <h3 className="mt-4 text-lg font-semibold">{service.title}</h3>
                <p className="mt-3 text-sm text-white/70">
                  {service.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
