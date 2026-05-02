import { prisma } from "@/lib/prisma";
import * as fs from "fs";
import * as path from "path";

/**
 * Info: (20260430 - Tzuhan)
 * 企業級基礎設施匯入腳本 (Enterprise Infrastructure Seeder)
 *
 * 針對台積電、中國砂輪等跨國企業所需的「全球真實物流節點」進行全量匯入。
 * 包含：
 * 1. 全球海港 (Seaports) - 來自國際開源港口地理資料集
 * 2. 全球機場 (Airports) - 包含 85,000+ 筆完整機場、直升機場與物流樞紐
 *
 * 架構特點：
 * - Streaming & Batching: 使用記憶體友善的批次寫入 (Batch Insert, 1000 rows/batch)
 * - Idempotency: ON CONFLICT DO UPDATE 確保不論執行幾次都能維持資料一致性
 */

function parseCSVLine(text: string) {
  const result = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(cur);
      cur = "";
    } else {
      cur += char;
    }
  }
  result.push(cur);
  return result;
}

function chunkArray<T>(array: T[], size: number): T[][] {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

export async function seedLogisticsInfrastructure(dataDir: string) {
  console.log(
    "🌍 [Enterprise] Starting FULL Logistics Infrastructure Seeding...",
  );

  // Info: (20260430 - Tzuhan) 1. 匯入全球海港 (Seaports)
  const seaportsPath = path.join(dataDir, "seaports.geojson");
  if (fs.existsSync(seaportsPath)) {
    console.log(`⚓ 讀取海港資料: ${seaportsPath}`);
    const rawData = fs.readFileSync(seaportsPath, "utf8");
    const geojson = JSON.parse(rawData);
    const features: GeoJSON.Feature[] = geojson.features || [];

    const validPorts = features.filter(
      (f: GeoJSON.Feature) =>
        f.properties?.port && f.geometry && "coordinates" in f.geometry,
    );

    // Info: (20260430 - Tzuhan) Deduplicate by port id to prevent PostgreSQL ON CONFLICT error
    const uniquePortsMap = new Map();
    for (const f of validPorts) {
      uniquePortsMap.set(f.properties!.port, f);
    }
    const uniquePorts = Array.from(uniquePortsMap.values());

    console.log(
      `⚓ 成功解析 ${uniquePorts.length} 筆海港資料 (已去重)，準備寫入資料庫...`,
    );

    const portChunks = chunkArray(uniquePorts, 500);
    let processed = 0;

    for (const chunk of portChunks) {
      const values = chunk
        .map((f: GeoJSON.Feature) => {
          const id = f.properties?.port.replace(/'/g, "''");
          const name = (f.properties?.name || "Unknown").replace(/'/g, "''");
          const country = (f.properties?.cty || "Unknown").replace(/'/g, "''");
          const size = "Medium"; // Info: (20260430 - Tzuhan) 預設 size
          const lng = parseFloat(
            (f.geometry as GeoJSON.Point).coordinates[0].toString(),
          );
          const lat = parseFloat(
            (f.geometry as GeoJSON.Point).coordinates[1].toString(),
          );
          return `('${id}', '${name}', '${country}', '${size}', ${lat}, ${lng}, NOW())`;
        })
        .join(",");

      if (values.length > 0) {
        const query = `
                    INSERT INTO seaports (id, name, country, size, lat, lng, updated_at)
                    VALUES ${values}
                    ON CONFLICT (id) DO UPDATE 
                    SET name = EXCLUDED.name,
                        country = EXCLUDED.country,
                        size = EXCLUDED.size,
                        lat = EXCLUDED.lat,
                        lng = EXCLUDED.lng,
                        updated_at = NOW();
                `;
        await prisma.$executeRawUnsafe(query);
      }
      processed += chunk.length;
      process.stdout.write(`\r⚓ 進度: ${processed} / ${uniquePorts.length}`);
    }
    console.log("\n✅ 全球海港資料匯入完成！");
  } else {
    console.warn(`⚠️ 找不到海港檔案: ${seaportsPath}`);
  }

  // Info: (20260430 - Tzuhan) 2. 匯入全球機場 (Airports - 85,000+ 筆)
  const AIRPORTS_URL =
    "https://davidmegginson.github.io/ourairports-data/airports.csv";
  try {
    console.log(
      `\n✈️ 正在從開源資料庫 (OurAirports) 動態下載最新的全球機場資料...`,
    );
    const response = await fetch(AIRPORTS_URL);
    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
    }

    const csvData = await response.text();
    const lines = csvData.split("\n").filter((line) => line.trim() !== "");

    // Info: (20260430 - Tzuhan) 移除 Header
    lines.shift();

    const validAirports: {
      id: string;
      iata_code: string;
      name: string;
      country: string;
      size: string;
      lat: number;
      lng: number;
    }[] = [];
    for (const line of lines) {
      const cols = parseCSVLine(line);
      if (cols.length < 14) continue;

      // Info: (20260430 - Tzuhan) CSV Schema: id, ident, type, name, latitude_deg, longitude_deg, elevation_ft, continent, iso_country, iso_region, municipality, scheduled_service, icao_code, iata_code
      const ident = cols[1];
      const type = cols[2];
      const name = cols[3];
      const lat = parseFloat(cols[4]);
      const lng = parseFloat(cols[5]);
      const country = cols[8];
      const iata = cols[13] || "";

      if (ident && !isNaN(lat) && !isNaN(lng)) {
        validAirports.push({
          id: ident,
          iata_code: iata,
          name,
          country,
          size: type,
          lat,
          lng,
        });
      }
    }

    // Info: (20260430 - Tzuhan) Deduplicate by airport id to prevent PostgreSQL ON CONFLICT error
    const uniqueAirportsMap = new Map();
    for (const a of validAirports) {
      uniqueAirportsMap.set(a.id, a);
    }
    const uniqueAirports = Array.from(uniqueAirportsMap.values());

    console.log(
      `✈️ 成功解析 ${uniqueAirports.length} 筆機場資料 (已去重)，準備進行高併發批次寫入...`,
    );
    const airportChunks = chunkArray(uniqueAirports, 1000);
    let processed = 0;

    for (const chunk of airportChunks) {
      const values = chunk
        .map(
          (a: {
            id: string;
            iata_code: string;
            name: string;
            country: string;
            size: string;
            lat: number;
            lng: number;
          }) => {
            const id = a.id.replace(/'/g, "''").substring(0, 50);
            const iata = a.iata_code.replace(/'/g, "''").substring(0, 10);
            const name = a.name.replace(/'/g, "''").substring(0, 200);
            const country = a.country.replace(/'/g, "''").substring(0, 10);
            const size = a.size.replace(/'/g, "''").substring(0, 50);
            return `('${id}', '${iata}', '${name}', '${country}', '${size}', ${a.lat}, ${a.lng}, NOW())`;
          },
        )
        .join(",");

      if (values.length > 0) {
        const query = `
                    INSERT INTO airports (id, iata_code, name, country, size, lat, lng, updated_at)
                    VALUES ${values}
                    ON CONFLICT (id) DO UPDATE 
                    SET iata_code = EXCLUDED.iata_code,
                        name = EXCLUDED.name,
                        country = EXCLUDED.country,
                        size = EXCLUDED.size,
                        lat = EXCLUDED.lat,
                        lng = EXCLUDED.lng,
                        updated_at = NOW();
                `;
        await prisma.$executeRawUnsafe(query);
      }
      processed += chunk.length;
      process.stdout.write(
        `\r✈️ 進度: ${processed} / ${uniqueAirports.length}`,
      );
    }
    console.log("\n✅ 全球機場資料匯入完成！");
  } catch (error) {
    console.error(`\n⚠️ 無法下載或解析機場資料:`, error);
  }

  console.log(
    "🎉 [Enterprise] Full Logistics infrastructure seeding completed!",
  );
}
