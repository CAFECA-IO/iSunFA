import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { prisma } from "@/lib/prisma";
import { storageService } from "@/services/storage.service";
import { createHash } from "crypto";

/**
 * 掃描檔案並產生唯一的根雜湊 (Root Hash)
 * @param fileBuffer 原始檔案的 Buffer
 * @returns 十六進制的雜湊字串
 */
export function generateFileHash(fileBuffer: Buffer): string {
  // 使用 sha256 演算法
  const hashSum = createHash("sha256");

  // 開始掃描內容
  hashSum.update(fileBuffer);

  // 產出最終雜湊值 (身份證)
  return hashSum.digest("hex");
}

/**
 * 上傳檔案
 * POST /api/v1/file/upload
 */
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return jsonFail(ApiCode.VALIDATION_ERROR, "No file uploaded");
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // --- Step 1: 掃描檔案 (Scanning) ---
    const fileHash = generateFileHash(buffer);
    console.log(`掃描完成，檔案身份證為: ${fileHash}`);

    // 檢查資料庫是否已有相同 Hash 的檔案 (重複刪除檢查)
    const existing = await prisma.file.findFirst({ where: { hash: fileHash } });
    if (existing) {
      // Info: (20260213 - Julian) 如果已有相同 Hash，直接回傳舊的資料 (De-duplication)
      return jsonOk(existing);
    }

    // --- Step 2 & 3: Laria 切割檔案 (Laria Encoding) & IPFS 存儲 (IPFS Storage) ---
    // StorageService.uploadLaria 會處理切割並上傳所有 shards，最終返回 metadata hash
    const ipfsHash = await storageService.uploadLaria(file);
    const storageDomain = process.env.STORAGE_DOMAIN || "";
    // Info: (20260213 - Julian) 組合可訪問的 URL
    const fileUrl = storageDomain
      ? `${storageDomain}/api/v1/file/${ipfsHash}`
      : `/api/v1/file/${ipfsHash}`;

    // --- Step 4: 儲存算出的 Hash (Store Hash) ---
    const newFile = await prisma.file.create({
      data: {
        fileName: file.name,
        hash: fileHash, // SHA256 用於重複檢查
        mimeType: file.type,
        fileSize: file.size,
        url: fileUrl,
      },
    });

    return jsonOk(newFile);
  } catch (error) {
    console.error("[API] /file/upload error:", error);
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, "Internal Server Error");
  }
}

