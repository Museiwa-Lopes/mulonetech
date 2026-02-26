import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth/admin";

export default async function AdminNewServicePage() {
  const session = await getAdminSession();
  if (!session) {
    redirect("/admin/login");
  }
  redirect("/admin/servicos");
}
