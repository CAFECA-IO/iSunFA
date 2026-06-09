import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export async function GET() {
  try {
    const dataDir = path.join(process.cwd(), "public", "data");
    const options: Record<string, string[]> = {};

    try {
      const stocks = await fs.readdir(dataDir, { withFileTypes: true });
      for (const stock of stocks) {
        if (!stock.isDirectory()) continue;
        const stockId = stock.name;
        const yearsDir = path.join(dataDir, stockId);
        
        let years;
        try {
          years = await fs.readdir(yearsDir, { withFileTypes: true });
        } catch {
          continue;
        }
        
        for (const year of years) {
          if (!year.isDirectory()) continue;
          const yearStr = year.name;
          const targetDir = path.join(yearsDir, yearStr, "outputs", "e2e_roadmap-sprint1");
          
          try {
            const stats = await fs.stat(targetDir);
            if (stats.isDirectory()) {
              if (!options[stockId]) {
                options[stockId] = [];
              }
              options[stockId].push(yearStr);
            }
          } catch {
            // Info: (20260608 - Tzuhan) Target dir doesn't exist, skip
          }
        }
      }
    } catch {
      // Info: (20260608 - Tzuhan) Data dir doesn't exist
      return NextResponse.json({ error: "Data directory not found" }, { status: 404 });
    }

    return NextResponse.json(options);
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
