import { redirect } from "next/navigation";
import { clearAdminSession, getAdminSession } from "@/lib/auth/admin";

export default async function AdminLogoutPage() {
  const session = await getAdminSession();
  if (!session) {
    redirect("/admin/login");
  }

  return (
    <main className="page-bg text-white">
      <div className="mx-auto min-h-[calc(100vh-64px)] max-w-4xl px-4 py-10 sm:px-6">
        <div className="card rounded-3xl p-6 sm:p-8">
          <p className="text-sm uppercase tracking-[0.2em] text-white/60">Sessão</p>
          <h1 className="font-display mt-3 text-3xl font-semibold">Terminar sessão</h1>
          <p className="mt-2 text-sm text-white/70">
            Confirme para sair do painel de administração.
          </p>

          <form
            className="mt-5"
            action={async () => {
              "use server";
              await clearAdminSession();
              redirect("/admin/login");
            }}
          >
            <button type="submit" className="btn-primary">
              Sair agora
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

