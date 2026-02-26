import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth/admin";
import { dbQuery, isDatabaseConfigured } from "@/lib/db/postgres";
import { createAdminUserAction, toggleAdminUserStatusAction } from "../actions";

type AdminUser = {
  id: number;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
  last_login_at: string | null;
};

export default async function AdminUsersPage() {
  const session = await getAdminSession();
  if (!session) {
    redirect("/admin/login");
  }

  const hasDatabase = isDatabaseConfigured();
  let users: AdminUser[] = [];

  if (hasDatabase) {
    try {
      const result = await dbQuery<AdminUser>(
        `select id, email, role, is_active, created_at::text, last_login_at::text
         from admin_users
         order by id asc`
      );
      users = result.rows;
    } catch {
      // keep empty when table is not ready yet
    }
  }

  return (
    <main className="page-bg text-white">
      <div className="mx-auto min-h-[calc(100vh-64px)] max-w-6xl px-4 py-10 sm:px-6">
        <div className="card rounded-3xl p-6 sm:p-8">
          <p className="text-sm uppercase tracking-[0.2em] text-white/60">Admin</p>
          <h1 className="font-display mt-3 text-3xl font-semibold">Utilizadores</h1>
          <p className="mt-2 text-sm text-white/70">
            Gestão de utilizadores do painel guardados no PostgreSQL.
          </p>
        </div>

        <section className="mt-6 card rounded-3xl p-6 sm:p-8">
          <div className="mb-6 rounded-2xl border border-white/10 bg-[#0b0f1a] p-4">
            <h2 className="font-display text-xl font-semibold">Novo utilizador admin</h2>
            <form action={createAdminUserAction} className="mt-4 grid gap-3 sm:grid-cols-3">
              <input
                className="h-11 rounded-xl border border-white/10 bg-[#0b0f1a] px-4 text-sm"
                name="email"
                type="email"
                placeholder="email@dominio.com"
                required
              />
              <input
                className="h-11 rounded-xl border border-white/10 bg-[#0b0f1a] px-4 text-sm"
                name="password"
                type="password"
                placeholder="Palavra-passe"
                required
              />
              <div className="flex gap-2">
                <input
                  className="h-11 flex-1 rounded-xl border border-white/10 bg-[#0b0f1a] px-4 text-sm"
                  name="role"
                  defaultValue="admin"
                />
                <button className="btn-primary" type="submit">
                  Guardar
                </button>
              </div>
            </form>
          </div>

          {!hasDatabase ? (
            <p className="text-sm text-[#ff8bb5]">PostgreSQL não configurado.</p>
          ) : users.length === 0 ? (
            <p className="text-sm text-white/70">Ainda não existem utilizadores na tabela `admin_users`.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead className="text-white/60">
                  <tr>
                    <th className="pb-3">ID</th>
                    <th className="pb-3">E-mail</th>
                    <th className="pb-3">Papel</th>
                    <th className="pb-3">Estado</th>
                    <th className="pb-3">Último login</th>
                    <th className="pb-3">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-t border-white/10">
                      <td className="py-3">{user.id}</td>
                      <td className="py-3">{user.email}</td>
                      <td className="py-3">{user.role}</td>
                      <td className="py-3">{user.is_active ? "Ativo" : "Inativo"}</td>
                      <td className="py-3">{user.last_login_at ?? "-"}</td>
                      <td className="py-3">
                        <form action={toggleAdminUserStatusAction}>
                          <input type="hidden" name="user_id" value={user.id} />
                          <button className="btn-ghost text-xs" type="submit">
                            {user.is_active ? "Desativar" : "Ativar"}
                          </button>
                        </form>
                      </td>
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
