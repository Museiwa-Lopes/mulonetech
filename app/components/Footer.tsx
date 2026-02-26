"use client";

import { FormEvent, useState } from "react";

type FooterProps = {
  eyebrow: string;
  title: string;
  description: string;
  badges: string[];
};

export default function Footer({ eyebrow, title, description, badges }: FooterProps) {
  const [necessidade, setNecessidade] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState("");
  const needOptions = [
    "Atendimento consultivo",
    "Diagnóstico gratuito",
    "Projectos à medida",
  ];

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback("");

    if (!necessidade) {
      setFeedback("Seleccione uma necessidade antes de enviar.");
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: String(formData.get("nome") ?? ""),
          email: String(formData.get("email") ?? ""),
          assunto: String(formData.get("assunto") ?? ""),
          mensagem: String(formData.get("mensagem") ?? ""),
          necessidade,
        }),
      });

      if (!response.ok) {
        setFeedback("Erro ao enviar mensagem. Tente novamente.");
        return;
      }

      setFeedback("Mensagem enviada com sucesso.");
      setNecessidade("");
      form.reset();
    } catch {
      setFeedback("Erro ao enviar mensagem. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <footer id="contacto" className="px-4 pb-10 pt-2 sm:px-6 sm:pb-14 sm:pt-4">
      <div className="mx-auto grid max-w-6xl gap-8 rounded-3xl border border-white/10 bg-[#0c1222]/70 p-6 sm:p-8 lg:p-10 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-white/60">{eyebrow}</p>
          <h2 className="font-display mt-3 text-3xl font-semibold">{title}</h2>
          <p className="mt-3 text-white/70">{description}</p>
          <div className="mt-4 flex flex-wrap gap-3 text-sm text-white/70">
            {badges.map((badge) => (
              <span key={badge} className="badge">
                {badge}
              </span>
            ))}
          </div>
        </div>

        <div className="card rounded-2xl p-6">
          <p className="text-sm text-white/60">Enviar mensagem</p>
          <form className="mt-3 grid gap-3 text-sm" onSubmit={handleSubmit}>
            <div className="grid gap-2">
              <p className="text-white/80">Necessidade</p>
              <div className="grid gap-2 sm:grid-cols-3">
                {needOptions.map((option) => {
                  const selected = necessidade === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setNecessidade(option)}
                      className={`rounded-xl border px-3 py-2 text-left text-xs transition ${
                        selected
                          ? "border-[#ffc164] bg-[#ffc164]/15 text-white"
                          : "border-white/10 bg-[#0b0f1a] text-white/75 hover:border-white/25"
                      }`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            </div>
            <input
              className="h-10 rounded-xl border border-white/10 bg-[#0b0f1a] px-3"
              name="nome"
              placeholder="O seu nome"
              required
            />
            <input
              className="h-10 rounded-xl border border-white/10 bg-[#0b0f1a] px-3"
              name="email"
              type="email"
              placeholder="O seu e-mail"
              required
            />
            <input
              className="h-10 rounded-xl border border-white/10 bg-[#0b0f1a] px-3"
              name="assunto"
              placeholder="Assunto"
            />
            <textarea
              className="min-h-[110px] rounded-xl border border-white/10 bg-[#0b0f1a] px-3 py-2"
              name="mensagem"
              placeholder="Escreva a sua mensagem..."
              required
            />
            <button
              className="btn-primary mt-2 w-full disabled:opacity-60 sm:w-fit"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? "A enviar..." : "Enviar mensagem"}
            </button>
            {feedback ? <p className="text-xs text-white/75">{feedback}</p> : null}
          </form>
        </div>
      </div>

      <div className="mx-auto mt-8 flex max-w-6xl flex-col items-start justify-between gap-4 text-xs text-white/50 sm:flex-row sm:items-center">
        <p>© 2026 Mulone Tech. Todos os direitos reservados.</p>
        <div className="flex gap-4">
          <span>Política de privacidade</span>
          <span>Termos de utilização</span>
        </div>
      </div>
    </footer>
  );
}
