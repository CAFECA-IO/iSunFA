import { prisma } from "@/lib/prisma";
import * as path from "path";
import { seedLogisticsCoefficients } from "./seed_logistics_coefficients";
import { seedLogisticsInfrastructure } from "./seed_full_logistics_infrastructure";
import { fileURLToPath } from "url";

const currentFilename = fileURLToPath(import.meta.url);
const currentDirname = path.dirname(currentFilename);

async function main() {
  console.log("🚀 開始執行 Prisma 全量企業級 Seeding...");

  await seedLogisticsCoefficients();

  const dataDir = path.join(currentDirname, "data");
  await seedLogisticsInfrastructure(dataDir);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
