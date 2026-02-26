import nodemailer from "nodemailer";
import { NextResponse } from "next/server";
import { dbQuery, isDatabaseConfigured } from "@/lib/db/postgres";

const validNeeds = new Set([
  "Atendimento consultivo",
  "Diagnóstico gratuito",
  "Projectos à medida",
]);

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function POST(request: Request) {
  try {
    const { nome, email, assunto, mensagem, necessidade } = await request.json();
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;

    const cleanNome = String(nome ?? "").trim();
    const cleanEmail = String(email ?? "").trim();
    const cleanAssunto = String(assunto ?? "").trim();
    const cleanMensagem = String(mensagem ?? "").trim();
    const cleanNecessidade = String(necessidade ?? "").trim();

    if (!cleanNome || !cleanEmail || !cleanMensagem || !cleanNecessidade) {
      return NextResponse.json(
        { error: "Preencha todos os campos obrigatórios." },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return NextResponse.json({ error: "Email inválido." }, { status: 400 });
    }

    if (!validNeeds.has(cleanNecessidade)) {
      return NextResponse.json({ error: "Necessidade inválida." }, { status: 400 });
    }

    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { error: "Base de dados não configurada no servidor." },
        { status: 500 }
      );
    }

    await dbQuery(
      `insert into messages (name, email, subject, message, status)
       values ($1, $2, $3, $4, 'pendente')`,
      [cleanNome, cleanEmail, cleanAssunto || cleanNecessidade, cleanMensagem]
    );

    if (emailUser && emailPass) {
      try {
        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: emailUser,
            pass: emailPass,
          },
        });

        await transporter.sendMail({
          from: `"Website Mulone Tech" <${emailUser}>`,
          to: emailUser,
          replyTo: cleanEmail,
          subject: `Nova mensagem do site - ${cleanNecessidade}`,
          html: `
            <h2>Nova necessidade recebida</h2>
            <p><strong>Nome:</strong> ${escapeHtml(cleanNome)}</p>
            <p><strong>Email:</strong> ${escapeHtml(cleanEmail)}</p>
            <p><strong>Necessidade:</strong> ${escapeHtml(cleanNecessidade)}</p>
            <p><strong>Assunto:</strong> ${escapeHtml(cleanAssunto || "Sem assunto")}</p>
            <p><strong>Mensagem:</strong></p>
            <p>${escapeHtml(cleanMensagem).replaceAll("\n", "<br />")}</p>
          `,
        });
      } catch {
        // Keep request successful when SMTP is unavailable; message remains stored in DB.
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Erro ao enviar mensagem" }, { status: 500 });
  }
}


