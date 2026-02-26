import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth/admin";
import { dbQuery, isDatabaseConfigured } from "@/lib/db/postgres";
import { replyMessageAction } from "../actions";

type Message = {
  id: number;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  status: string | null;
  reply: string | null;
  created_at: string;
};

export default async function AdminMessagesPage() {
  const session = await getAdminSession();
  if (!session) {
    redirect("/admin/login");
  }

  const hasDatabase = isDatabaseConfigured();
  let messages: Message[] = [];

  if (hasDatabase) {
    try {
      const result = await dbQuery<Message>("select * from messages order by created_at desc");
      messages = result.rows;
    } catch {
      // keep empty state if table is missing
    }
  }

  return (
    <main className="page-bg text-white">
      <div className="mx-auto min-h-[calc(100vh-64px)] max-w-6xl px-4 py-10 sm:px-6">
        <div className="card rounded-3xl p-6 sm:p-8">
          <p className="text-sm uppercase tracking-[0.2em] text-white/60">Admin</p>
          <h1 className="font-display mt-3 text-3xl font-semibold">Mensagens</h1>
          <p className="mt-2 text-sm text-white/70">Responder e gerir contactos recebidos.</p>
          {!hasDatabase ? (
            <p className="mt-3 text-sm text-[#ff8bb5]">
              PostgreSQL não configurado. Defina `DATABASE_URL`.
            </p>
          ) : null}
        </div>

        <section className="mt-6 grid gap-5">
          {messages.map((item) => (
            <div key={item.id} className="card rounded-3xl p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-white/60">Mensagem de</p>
                  <p className="text-lg font-semibold">{item.name}</p>
                  <p className="text-sm text-white/60">{item.email}</p>
                </div>
                <span className="badge">{item.status ?? "pendente"}</span>
              </div>
              <p className="mt-3 text-sm text-white/70">{item.subject}</p>
              <p className="mt-3 text-sm">{item.message}</p>
              <form action={replyMessageAction} className="mt-5 grid gap-3">
                <input type="hidden" name="message_id" value={item.id} />
                <label className="grid gap-2 text-sm">
                  Resposta
                  <textarea
                    className="min-h-[100px] rounded-xl border border-white/10 bg-[#0b0f1a] px-4 py-3"
                    name="reply"
                    defaultValue={item.reply ?? ""}
                  />
                </label>
                <button className="btn-primary w-fit" type="submit">
                  Guardar resposta
                </button>
              </form>
            </div>
          ))}
          {messages.length === 0 ? (
            <div className="card rounded-3xl p-8 text-sm text-white/70">
              Nenhuma mensagem recebida ainda.
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}


