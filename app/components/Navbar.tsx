import NavbarClient from "./NavbarClient";
import { dbQuery, isDatabaseConfigured } from "@/lib/db/postgres";

type AppSettingRow = {
  value: unknown;
};

export default async function Navbar() {
  let brandName = "Mulone Tech";
  let brandTagline = "Soluções digitais inteligentes";
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
    <NavbarClient
      email={null}
      brandName={brandName}
      brandTagline={brandTagline}
      brandLogoUrl={brandLogoUrl}
    />
  );
}
