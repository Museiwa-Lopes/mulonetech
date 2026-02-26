import { dbQuery, isDatabaseConfigured } from "@/lib/db/postgres";

export default async function ProfileHighlight() {
  let profile:
    | {
        avatar_url: string | null;
        display_name: string | null;
        role: string | null;
        bio: string | null;
      }
    | null = null;

  if (isDatabaseConfigured()) {
    try {
      const result = await dbQuery<{
        avatar_url: string | null;
        display_name: string | null;
        role: string | null;
        bio: string | null;
      }>("select avatar_url, display_name, role, bio from admin_profile where id = 1");
      profile = result.rows[0] ?? null;
    } catch {
      profile = null;
    }
  }

  return (
    <section className="px-4 pb-12 sm:px-6 sm:pb-16">
      <div className="mx-auto grid max-w-6xl items-center gap-6 rounded-3xl border border-white/10 bg-[#0c1222]/70 p-6 sm:p-8 lg:p-10 lg:grid-cols-[0.6fr_1fr]">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-6">
          <div className="h-20 w-20 overflow-hidden rounded-full border border-white/20 bg-[#0b0f1a]">
            {profile?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt={profile.display_name ?? "Perfil"}
                className="h-full w-full object-cover"
                src={profile.avatar_url}
              />
            ) : null}
          </div>
          <div>
            <p className="text-sm text-white/60">Responsável</p>
            <p className="text-lg font-semibold">
              {profile?.display_name ?? "Equipa Mulone Tech"}
            </p>
            <p className="text-sm text-white/70">
              {profile?.role ?? "Direcção e atendimento estratégico"}
            </p>
          </div>
        </div>
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-white/60">
            Perfil
          </p>
          <h2 className="font-display mt-3 text-2xl font-semibold">
            Contacte quem entende o seu negócio
          </h2>
          <p className="mt-3 text-sm text-white/70">
            {profile?.bio ??
              "Atendimento consultivo para empresas que desejam ganhar velocidade, segurança e visibilidade digital."}
          </p>
        </div>
      </div>
    </section>
  );
}




