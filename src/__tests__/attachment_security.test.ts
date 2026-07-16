// Info: (20260716 - Emily) 附件安全測試(#6517): magic bytes 裁決、掃毒攔截/fail-open、配額邊界、記帳時機

import { describe, it, expect, jest } from "@jest/globals";
import { matchesDeclaredMimeType } from "@/lib/file_signature";
import {
  IVirusScanner,
  IVirusScanResult,
  VirusScanStatusEnum,
} from "@/lib/virus_scanner";
import { AttachmentSecurityService } from "@/services/attachment_security.service";
import { API_ERRORS, ApiError } from "@/lib/utils/error_dictionary";
import { CARBON_STORAGE_QUOTA_BYTES } from "@/constants/carbon_chatbot";
import type { StorageService } from "@/services/storage.service";

const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

describe("matchesDeclaredMimeType", () => {
  const cases: [string, number[], boolean][] = [
    ["application/pdf", [0x25, 0x50, 0x44, 0x46, 0x2d, 0x31], true], // Info: (20260716 - Emily) %PDF-1 檔頭
    ["image/png", [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1], true],
    ["image/jpeg", [0xff, 0xd8, 0xff, 0xe0], true],
    ["image/gif", [0x47, 0x49, 0x46, 0x38, 0x39, 0x61], true], // Info: (20260716 - Emily) GIF89a 檔頭
    [XLSX_MIME, [0x50, 0x4b, 0x03, 0x04, 0x14], true], // Info: (20260716 - Emily) ZIP(PK)檔頭，XLSX 容器
    // Info: (20260716 - Emily) 偽裝: EXE(MZ)宣告成 PDF → 拒
    ["application/pdf", [0x4d, 0x5a, 0x90, 0x00], false],
    // Info: (20260716 - Emily) PNG 宣告成 JPEG → 拒
    ["image/jpeg", [0x89, 0x50, 0x4e, 0x47], false],
  ];
  it.each(cases)("%s with magic %p → %p", (mime, bytes, expected) => {
    expect(matchesDeclaredMimeType(Uint8Array.from(bytes), mime)).toBe(
      expected,
    );
  });

  it("should accept plain text as csv but reject binary-with-NUL", () => {
    const csv = new TextEncoder().encode("year,scope,kwh\n2025,2,1200000\n");
    expect(matchesDeclaredMimeType(csv, "text/csv")).toBe(true);
    expect(
      matchesDeclaredMimeType(Uint8Array.from([0x61, 0x00, 0x62]), "text/csv"),
    ).toBe(false);
  });

  it("should validate webp RIFF container and heic ftyp brand", () => {
    const webp = new TextEncoder().encode("RIFF????WEBPVP8 ");
    expect(matchesDeclaredMimeType(webp, "image/webp")).toBe(true);
    const heic = new TextEncoder().encode("????ftypheic....");
    expect(matchesDeclaredMimeType(heic, "image/heic")).toBe(true);
    expect(matchesDeclaredMimeType(webp, "image/heic")).toBe(false);
  });

  it("should reject undeclared mime types (whitelist)", () => {
    expect(
      matchesDeclaredMimeType(
        Uint8Array.from([0x4d, 0x5a]),
        "application/x-exe",
      ),
    ).toBe(false);
  });
});

// Info: (20260716 - Emily) service 測試: 全依賴注入，不觸 ClamAV/Laria/DB
const buildFile = (bytes: number[], name: string, type: string): File =>
  new File([Uint8Array.from(bytes)], name, { type });

const PDF_BYTES = [0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37];

const buildDeps = (overrides?: {
  scanResult?: IVirusScanResult;
  usedBytes?: bigint;
}) => {
  const scanner: IVirusScanner = {
    scan: jest
      .fn<() => Promise<IVirusScanResult>>()
      .mockResolvedValue(
        overrides?.scanResult ?? { status: VirusScanStatusEnum.CLEAN },
      ),
  };
  const storage = {
    uploadLaria: jest.fn<() => Promise<string>>().mockResolvedValue("cid-123"),
  } as unknown as StorageService;
  const usageRepo = {
    getUsedBytes: jest
      .fn<(address: string) => Promise<bigint>>()
      .mockResolvedValue(overrides?.usedBytes ?? BigInt(0)),
    addUsedBytes: jest
      .fn<(address: string, deltaBytes: bigint) => Promise<void>>()
      .mockResolvedValue(undefined),
  };
  return { scanner, storage, usageRepo };
};

describe("AttachmentSecurityService", () => {
  it("should upload and record usage on the happy path", async () => {
    const deps = buildDeps();
    const service = new AttachmentSecurityService(deps);
    const file = buildFile(PDF_BYTES, "bill.pdf", "application/pdf");

    const result = await service.processUpload({ address: "0xA", file });

    expect(result.cid).toBe("cid-123");
    expect(deps.usageRepo.addUsedBytes).toHaveBeenCalledWith(
      "0xA",
      BigInt(file.size),
    );
  });

  it("should reject disguised files before scanning or uploading", async () => {
    const deps = buildDeps();
    const service = new AttachmentSecurityService(deps);
    const file = buildFile([0x4d, 0x5a, 0x90], "evil.pdf", "application/pdf");

    await expect(
      service.processUpload({ address: "0xA", file }),
    ).rejects.toMatchObject({
      code: API_ERRORS.IS_ATTACHMENT_TYPE_MISMATCH.code,
    });
    expect(deps.scanner.scan).not.toHaveBeenCalled();
    expect(deps.storage.uploadLaria).not.toHaveBeenCalled();
  });

  it("should reject infected files without uploading", async () => {
    const deps = buildDeps({
      scanResult: {
        status: VirusScanStatusEnum.INFECTED,
        signature: "Eicar-Test",
      },
    });
    const service = new AttachmentSecurityService(deps);
    const file = buildFile(PDF_BYTES, "bill.pdf", "application/pdf");

    await expect(
      service.processUpload({ address: "0xA", file }),
    ).rejects.toMatchObject({ code: API_ERRORS.IS_ATTACHMENT_INFECTED.code });
    expect(deps.storage.uploadLaria).not.toHaveBeenCalled();
    expect(deps.usageRepo.addUsedBytes).not.toHaveBeenCalled();
  });

  it("should fail open when the scanner is unavailable", async () => {
    const deps = buildDeps({
      scanResult: { status: VirusScanStatusEnum.ERROR },
    });
    const service = new AttachmentSecurityService(deps);
    const file = buildFile(PDF_BYTES, "bill.pdf", "application/pdf");

    const result = await service.processUpload({ address: "0xA", file });
    expect(result.cid).toBe("cid-123");
  });

  it("should enforce the 5GB quota boundary", async () => {
    const file = buildFile(PDF_BYTES, "bill.pdf", "application/pdf");
    // Info: (20260716 - Emily) 剩餘空間恰好差 1 byte → 拒；恰好足夠 → 過
    const overQuota = buildDeps({
      usedBytes: CARBON_STORAGE_QUOTA_BYTES - BigInt(file.size) + BigInt(1),
    });
    await expect(
      new AttachmentSecurityService(overQuota).processUpload({
        address: "0xA",
        file,
      }),
    ).rejects.toMatchObject({
      code: API_ERRORS.IS_STORAGE_QUOTA_EXCEEDED.code,
    });
    expect(overQuota.storage.uploadLaria).not.toHaveBeenCalled();

    const exactFit = buildDeps({
      usedBytes: CARBON_STORAGE_QUOTA_BYTES - BigInt(file.size),
    });
    await expect(
      new AttachmentSecurityService(exactFit).processUpload({
        address: "0xA",
        file,
      }),
    ).resolves.toMatchObject({ cid: "cid-123" });
  });

  it("should wrap failures as ApiError only for adjudications (upload errors bubble)", async () => {
    const deps = buildDeps();
    (deps.storage.uploadLaria as jest.Mock).mockImplementation(() =>
      Promise.reject(new Error("laria down")),
    );
    const service = new AttachmentSecurityService(deps);
    const file = buildFile(PDF_BYTES, "bill.pdf", "application/pdf");

    const promise = service.processUpload({ address: "0xA", file });
    await expect(promise).rejects.toThrow("laria down");
    await expect(promise).rejects.not.toBeInstanceOf(ApiError);
    // Info: (20260716 - Emily) 上傳失敗不得記帳
    expect(deps.usageRepo.addUsedBytes).not.toHaveBeenCalled();
  });
});
