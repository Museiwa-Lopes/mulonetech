"use client";

import { useActionState } from "react";
import { signInAction } from "./actions";

export default function AdminLoginPage() {
  const [state, formAction] = useActionState(signInAction, {
    ok: true,
    message: "",
  });

  return (
    <main className="page-bg text-white">
      <div className="mx-auto flex min-h-screen max-w-4xl items-center px-4 py-12 sm:px-6 sm:py-14">
        <div className="card w-full rounded-3xl p-6 sm:p-8 lg:p-10">
          <p className="text-sm uppercase tracking-[0.2em] text-white/60">Área de administração</p>
          <h1 className="font-display mt-3 text-3xl font-semibold">Entrar no painel</h1>
          <p className="mt-2 text-sm text-white/70">
            Use o seu e-mail e a sua palavra-passe para aceder ao painel administrativo.
          </p>

          <form action={formAction} className="mt-6 grid gap-3">
            <label className="grid gap-2 text-sm">
              E-mail
              <input
                className="h-11 rounded-xl border border-white/10 bg-[#0b0f1a] px-4 text-white"
                name="email"
                type="email"
                placeholder="admin@mulonetech.com"
                required
              />
            </label>
            <label className="grid gap-2 text-sm">
              Palavra-passe
              <input
                className="h-11 rounded-xl border border-white/10 bg-[#0b0f1a] px-4 text-white"
                name="password"
                type="password"
                placeholder="••••••••"
                required
              />
            </label>
            <button className="btn-primary mt-2 w-fit" type="submit">
              Entrar
            </button>
            {!state.ok ? <p className="text-sm text-[#ff8bb5]">{state.message}</p> : null}
          </form>
        </div>
      </div>
    </main>
  );
}

