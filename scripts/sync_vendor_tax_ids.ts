import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";
import { VENDOR_RULES } from "@/constants/vendor_rules";

async function main() {
  const filePath = path.join(process.cwd(), "src/constants/vendor_rules.ts");
  let content = fs.readFileSync(filePath, "utf-8");

  const companies = await prisma.company.findMany({
    where: { taxId: { not: null } },
  });

  console.log(`Fetched ${companies.length} companies from DB.`);

  let updatedCount = 0;

  for (const vendor of VENDOR_RULES as unknown as {
    vendorId: string;
    aliases: string[];
    taxIds?: string[];
  }[]) {
    // Info: (20260521 - Tzuhan) Skip if it already has taxIds
    if (vendor.taxIds && vendor.taxIds.length > 0) continue;

    // Info: (20260521 - Tzuhan) Find a matching company
    const match = companies.find((c) =>
      vendor.aliases.some(
        (alias: string) =>
          c.name === alias ||
          c.abbreviation === alias ||
          c.name.includes(alias),
      ),
    );

    if (match && match.taxId) {
      console.log(
        `[Match] ${vendor.vendorId} -> ${match.name} (TaxId: ${match.taxId})`,
      );

      // Info: (20260521 - Tzuhan) Regex to find the aliases block and append taxIds
      // Info: (20260521 - Tzuhan) e.g. aliases: ["...", "..."],
      // Info: (20260521 - Tzuhan) -> aliases: ["...", "..."],\n    taxIds: ["..."],

      const escapeRegex = (s: string) =>
        s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      // Info: (20260521 - Tzuhan) We look for vendorId: "xxx", then the aliases array.
      const searchPattern = new RegExp(
        `(vendorId:\\s*"${escapeRegex(
          vendor.vendorId,
        )}",\\s*aliases:\\s*\\[.*?\\](?:,\\s*))`,
      );

      if (searchPattern.test(content)) {
        content = content.replace(
          searchPattern,
          `$1taxIds: ["${match.taxId}"],\n    `,
        );
        updatedCount++;
      } else {
        console.log(`Failed to inject into string for ${vendor.vendorId}`);
      }
    }
  }

  if (updatedCount > 0) {
    fs.writeFileSync(filePath, content, "utf-8");
    console.log(
      `Successfully updated ${updatedCount} vendors in vendor_rules.ts`,
    );
  } else {
    console.log("No new taxIds to update.");
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
