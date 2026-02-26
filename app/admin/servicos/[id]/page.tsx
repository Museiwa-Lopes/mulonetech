import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth/admin";

type ServiceByIdPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminServiceByIdPage({ params }: ServiceByIdPageProps) {
  const session = await getAdminSession();
  if (!session) {
    redirect("/admin/login");
  }

  await params;
  redirect("/admin/servicos");
}
