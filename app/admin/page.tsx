import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth/admin";
import { dbQuery, isDatabaseConfigured } from "@/lib/db/postgres";

type CounterRow = {
  total: number;
};

type AuditLogRow = {
  id: number;
  actor_email: string;
  action: string;
  entity: string;
  created_at: string;
};

export default async function AdminPage() {
  const session = await getAdminSession();
  if (!session) {
    redirect("/admin/login");
  }

  const hasDatabase = isDatabaseConfigured();
  let totalMessages = 0;
  let pendingReplies = 0;
  let totalProjects = 0;
  let totalServices = 0;
  let recentLogs: AuditLogRow[] = [];

  if (hasDatabase) {
    try {
      const [messagesResult, pendingResult, projectsResult, servicesResult] = await Promise.all([
        dbQuery<CounterRow>("select count(*)::int as total from messages"),
        dbQuery<CounterRow>(
          "select count(*)::int as total from messages where status is distinct from 'respondido'"
        ),
        dbQuery<CounterRow>("select count(*)::int as total from projects"),
        dbQuery<CounterRow>("select count(*)::int as total from services"),
      ]);

      totalMessages = messagesResult.rows[0]?.total ?? 0;
      pendingReplies = pendingResult.rows[0]?.total ?? 0;
      totalProjects = projectsResult.rows[0]?.total ?? 0;
      totalServices = servicesResult.rows[0]?.total ?? 0;
    } catch {
      // keep counters as zero if tables are missing
    }

    try {
      const logsResult = await dbQuery<AuditLogRow>(
        `select id, actor_email, action, entity, created_at::text
         from admin_audit_logs
         order by created_at desc
         limit 8`
      );
      recentLogs = logsResult.rows;
    } catch {
      // audit table may not exist yet
    }
  }

  return (
    <main className="page-bg text-white">
      <div className="mx-auto min-h-[calc(100vh-64px)] max-w-6xl px-4 py-10 sm:px-6">
        <div className="card rounded-3xl p-6 sm:p-8">
          <p className="text-sm uppercase tracking-[0.2em] text-white/60">Painel de administração</p>
          <h1 className="font-display mt-3 text-3xl font-semibold">Dashboard</h1>
          <p className="mt-2 text-sm text-white/70">Sessão iniciada como {session.email}</p>
          {!hasDatabase ? (
            <p className="mt-3 text-sm text-[#ff8bb5]">
              PostgreSQL não configurado. Defina `DATABASE_URL` para activar CRUD.
            </p>
          ) : null}
        </div>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="card rounded-2xl p-5">
            <p className="text-sm text-white/60">Mensagens</p>
            <p className="mt-2 text-2xl font-semibold">{totalMessages}</p>
          </div>
          <div className="card rounded-2xl p-5">
            <p className="text-sm text-white/60">Pendentes</p>
            <p className="mt-2 text-2xl font-semibold">{pendingReplies}</p>
          </div>
          <div className="card rounded-2xl p-5">
            <p className="text-sm text-white/60">Projectos</p>
            <p className="mt-2 text-2xl font-semibold">{totalProjects}</p>
          </div>
          <div className="card rounded-2xl p-5">
            <p className="text-sm text-white/60">Serviços</p>
            <p className="mt-2 text-2xl font-semibold">{totalServices}</p>
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link className="card rounded-2xl p-5 transition hover:-translate-y-0.5" href="/admin/mensagens">
            <p className="text-sm text-white/60">Atalho</p>
            <p className="mt-1 text-lg font-semibold">Gerir mensagens</p>
          </Link>
          <Link className="card rounded-2xl p-5 transition hover:-translate-y-0.5" href="/admin/projectos">
            <p className="text-sm text-white/60">Atalho</p>
            <p className="mt-1 text-lg font-semibold">Gerir projectos</p>
          </Link>
          <Link className="card rounded-2xl p-5 transition hover:-translate-y-0.5" href="/admin/servicos">
            <p className="text-sm text-white/60">Atalho</p>
            <p className="mt-1 text-lg font-semibold">Gerir serviços</p>
          </Link>
          <Link className="card rounded-2xl p-5 transition hover:-translate-y-0.5" href="/admin/conteudos">
            <p className="text-sm text-white/60">Atalho</p>
            <p className="mt-1 text-lg font-semibold">Editar conteúdos</p>
          </Link>
          <Link className="card rounded-2xl p-5 transition hover:-translate-y-0.5" href="/admin/configuracoes">
            <p className="text-sm text-white/60">Atalho</p>
            <p className="mt-1 text-lg font-semibold">Configurações</p>
          </Link>
          <Link className="card rounded-2xl p-5 transition hover:-translate-y-0.5" href="/admin/logout">
            <p className="text-sm text-white/60">Atalho</p>
            <p className="mt-1 text-lg font-semibold">Logout</p>
          </Link>
        </section>

        <section className="mt-6 card rounded-3xl p-6 sm:p-8">
          <h2 className="font-display text-xl font-semibold">Registo de actividade</h2>
          <p className="mt-2 text-sm text-white/70">
            Últimas alterações feitas no painel (utilizadores, uploads e conteúdo).
          </p>

          {recentLogs.length === 0 ? (
            <p className="mt-4 text-sm text-white/65">Sem registos ainda.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead className="text-white/60">
                  <tr>
                    <th className="pb-3">Quando</th>
                    <th className="pb-3">Utilizador</th>
                    <th className="pb-3">Acção</th>
                    <th className="pb-3">Entidade</th>
                  </tr>
                </thead>
                <tbody>
                  {recentLogs.map((log) => (
                    <tr key={log.id} className="border-t border-white/10">
                      <td className="py-3">{new Date(log.created_at).toLocaleString("pt-PT")}</td>
                      <td className="py-3">{log.actor_email}</td>
                      <td className="py-3">{log.action}</td>
                      <td className="py-3">{log.entity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

