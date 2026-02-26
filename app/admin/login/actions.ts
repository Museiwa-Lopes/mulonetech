"use server";

import { redirect } from "next/navigation";
import {
  createAdminSession,
  isAdminAuthConfigured,
  validateAdminCredentials,
} from "@/lib/auth/admin";

export async function signInAction(
  _prevState: { ok: boolean; message: string },
  formData: FormData
) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "").trim();

  if (!(await isAdminAuthConfigured())) {
    return { ok: false, message: "Autenticação admin não configurada." };
  }

  if (!(await validateAdminCredentials(email, password))) {
    return { ok: false, message: "E-mail ou palavra-passe inválidos." };
  }

  await createAdminSession(email);
  redirect("/admin");
}




