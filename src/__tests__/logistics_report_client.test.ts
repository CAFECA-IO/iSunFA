// Info: (20260731 - Tzuhan) 匯出客戶端的可測部分(issue 08 步驟二)
// Info: (20260731 - Tzuhan) fetch 與下載無法在此驗證,但 base64 解碼與「過大地圖提前丟棄」是純邏輯,
// Info: (20260731 - Tzuhan) 而這兩者出錯的後果分別是「檔案損毀」與「白花好幾 MB 頻寬」,值得有斷言。

import { describe, it, expect } from "@jest/globals";
import {
  base64ToBytes,
  dropOversizedMapImage,
} from "@/lib/utils/logistics_report_client";
import { LOGISTICS_PDF_MAP_MAX_BYTES } from "@/constants/logistics_pdf";
import type { ILogisticsReportPdfItem } from "@/validators";

const baseItem: ILogisticsReportPdfItem = {
  planCode: "R01-LAND",
  fileName: "R01-LAND_a-b_land_only.pdf",
  routeLabel: "Route 1",
  planLabel: "Land Only",
  originLabel: "A",
  destLabel: "B",
  weightKg: "1000",
  legs: [{ mode: "LAND", fromName: "A", toName: "B", distanceKm: 10 }],
};

const dataUrlOfBytes = (bytes: number): string =>
  `data:image/jpeg;base64,${"A".repeat(Math.ceil((bytes * 4) / 3))}`;

describe("base64ToBytes", () => {
  it("還原出原始位元組(PDF 前四個位元組為 %PDF)", () => {
    const base64 = Buffer.from("%PDF-1.7").toString("base64");
    const bytes = new Uint8Array(base64ToBytes(base64));
    expect(Array.from(bytes.slice(0, 4))).toEqual([0x25, 0x50, 0x44, 0x46]);
  });

  it("處理二進位中的高位位元組(不因字元編碼失真)", () => {
    const original = Uint8Array.from([0x00, 0x7f, 0x80, 0xff, 0xfe]);
    const base64 = Buffer.from(original).toString("base64");
    expect(Array.from(new Uint8Array(base64ToBytes(base64)))).toEqual(
      Array.from(original),
    );
  });

  it("空字串回空位元組(不拋錯)", () => {
    expect(new Uint8Array(base64ToBytes("")).length).toBe(0);
  });
});

describe("dropOversizedMapImage", () => {
  it("未超過上限時原樣保留", () => {
    const item = { ...baseItem, mapImageDataUrl: dataUrlOfBytes(1024) };
    expect(dropOversizedMapImage(item).mapImageDataUrl).toBe(
      item.mapImageDataUrl,
    );
  });

  it("超過上限時在前端就丟掉(不白花頻寬讓伺服端再拒絕一次)", () => {
    const item = {
      ...baseItem,
      mapImageDataUrl: dataUrlOfBytes(LOGISTICS_PDF_MAP_MAX_BYTES + 8192),
    };
    expect(dropOversizedMapImage(item).mapImageDataUrl).toBeUndefined();
  });

  it("丟掉地圖不影響其餘欄位(報告本身仍成立)", () => {
    const item = {
      ...baseItem,
      mapImageDataUrl: dataUrlOfBytes(LOGISTICS_PDF_MAP_MAX_BYTES + 8192),
    };
    const result = dropOversizedMapImage(item);
    expect(result.planCode).toBe("R01-LAND");
    expect(result.legs).toHaveLength(1);
  });

  it("本來沒有地圖時不動作", () => {
    expect(dropOversizedMapImage(baseItem).mapImageDataUrl).toBeUndefined();
  });
});
