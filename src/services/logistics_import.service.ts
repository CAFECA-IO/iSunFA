import * as xlsx from "xlsx";
import { z } from "zod";
import { logisticsRecordRepo } from "@/repositories/logistics_record.repo";

// Info: (20260618 - Tzuhan) 驗證的 Zod Schema
export const logisticsRowSchema = z.object({
  origin: z.string().min(1, "Origin is required"),
  destination: z.string().min(1, "Destination is required"),
  weightKg: z.preprocess(
    (val) => Number(val),
    z.number().min(0, "Weight must be positive"),
  ),
  transportationMode: z.string().min(1, "Transportation Mode is required"),
  waypoints: z.array(z.string()).optional().default([]),
});

export type LogisticsRow = z.infer<typeof logisticsRowSchema>;

export interface IPreviewResult {
  valid: boolean;
  errors: Array<{ index: number; row: unknown; issues: string[] }>;
  successCount: number;
}

export class LogisticsImportService {
  /**
   * Info: (20260618 - Tzuhan)
   * 提取上傳檔案的表頭 (Headers)
   */
  public extractHeaders(buffer: Buffer): string[] {
    const workbook = xlsx.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // Info: (20260618 - Tzuhan) 只讀取第一列作為 headers
    const headers = xlsx.utils.sheet_to_json(sheet, {
      header: 1,
    })[0] as string[];
    return headers || [];
  }

  /**
   * Info: (20260618 - Tzuhan)
   * 將原始資料依照前端傳來的 mapping 轉換成系統需要的格式，並進行 Zod 驗證
   */
  public previewData(rows: unknown[]): IPreviewResult {
    const errors: Array<{ index: number; row: unknown; issues: string[] }> = [];
    let successCount = 0;

    rows.forEach((row, index) => {
      const parsed = logisticsRowSchema.safeParse(row);
      if (!parsed.success) {
        errors.push({
          index,
          row,
          issues: parsed.error.errors.map(
            (e) => `${e.path.join(".")}: ${e.message}`,
          ),
        });
      } else {
        successCount++;
      }
    });

    return {
      valid: errors.length === 0,
      errors,
      successCount,
    };
  }

  /**
   * Info: (20260618 - Tzuhan)
   * 將通過驗證的資料分批寫入 LogisticsRecord
   */
  public async executeImport(accountBookId: string, rows: unknown[]) {
    // Info: (20260618 - Tzuhan) 在寫入前做最後的防護檢查
    const validRows: LogisticsRow[] = [];

    for (const row of rows) {
      const parsed = logisticsRowSchema.safeParse(row);
      if (parsed.success) {
        validRows.push(parsed.data);
      } else {
        throw new Error(`Data validation failed at backend execution.`);
      }
    }

    // Info: (20260618 - Tzuhan) 使用 repo 進行 createMany
    const created = await logisticsRecordRepo.createMany({
      data: validRows.map((row) => ({
        origin: row.origin,
        destination: row.destination,
        waypoints:
          row.waypoints && row.waypoints.length > 0 ? row.waypoints : undefined,
        weightKg: row.weightKg,
        transportationMode: row.transportationMode,
        accountBookId,
        status: "PENDING",
      })),
      skipDuplicates: true,
    });

    return {
      count: created.count,
    };
  }
}
