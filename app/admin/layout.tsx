import { Suspense } from "react";
import Link from "next/link";
import { getAdminSession } from "@/lib/auth/admin";
import { dbQuery, isDatabaseConfigured } from "@/lib/db/postgres";
import AdminToast from "./AdminToast";

const navItems = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/utilizadores", label: "Utilizadores" },
  { href: "/admin/servicos", label: "Serviços" },
  { href: "/admin/projectos", label: "Projectos" },
  { href: "/admin/mensagens", label: "Mensagens" },
  { href: "/admin/conteudos", label: "Conteúdos" },
  { href: "/admin/configuracoes", label: "Configurações" },
  { href: "/admin/logout", label: "Logout" },
];

type AppSettingRow = {
  value: unknown;
};

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getAdminSession();
  const showNav = Boolean(session);

  let brandName = "Mulone Tech";
  let brandTagline = "Solucoes digitais inteligentes";
  let brandLogoUrl = "";

  if (isDatabaseConfigured()) {
    try {
      const result = await dbQuery<AppSettingRow>(
        "select value from app_settings where key = 'branding' limit 1"
      );
      const brandingValue = result.rows[0]?.value;
      if (brandingValue && typeof brandingValue === "object") {
        const data = brandingValue as {
          brandName?: string;
          brandTagline?: string;
          brandLogoUrl?: string;
        };
        brandName = data.brandName || brandName;
        brandTagline = data.brandTagline || brandTagline;
        brandLogoUrl = data.brandLogoUrl || "";
      }
    } catch {
      // keep defaults while settings table is not ready
    }
  }

  return (
    <div className="min-h-screen">
      <Suspense fallback={null}>
        <AdminToast />
      </Suspense>
      {showNav ? (
        <div className="border-b border-white/10 bg-[#0b1020]/80 backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <Link href="/" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-[linear-gradient(120deg,#ffc164,#ff8bb5)]">
                {brandLogoUrl ? (
                  <img src={brandLogoUrl} alt={`Logotipo ${brandName}`} className="h-full w-full object-cover" />
                ) : null}
              </div>
              <div>
                <p className="font-display text-lg font-semibold tracking-tight">{brandName}</p>
                <p className="text-xs text-white/60">{brandTagline}</p>
              </div>
            </Link>

            <div className="flex flex-wrap items-center gap-2">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href} className="btn-ghost text-xs">
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : null}
      {children}
    </div>
  );
}
