import { ApiCode } from '@/lib/utils/status';
import path from 'path';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import { encodeFile } from '@/lib/laria';

export interface IStorageUploadResponse {
  hash: string;
  name: string;
  size: string;
}

export class StorageService {
  private storageDomain: string;

  constructor() {
    // Info: (20260128 - Luphia) Use environment variable for storage domain
    this.storageDomain = process.env.STORAGE_DOMAIN || '';
  }

  /**
   * Info: (20260128 - Luphia)
   * Upload a file to the storage service and return the file hash (multihash).
   * @param file - The file to upload (Blob or File)
   * @param filename - Optional filename
   */
  async uploadFile(file: Blob | File, filename?: string): Promise<string> {
    if (!this.storageDomain) {
      console.warn('[StorageService] STORAGE_DOMAIN is not set.');
    }

    const formData = new FormData();
    /**
     * Info: (20260128 - Luphia) Append file to FormData. 
     * If passing a Blob, a filename is often required by servers to detect it as a file upload.
     */
    formData.append('file', file, filename || (file as File).name || 'upload.bin');

    const domain = this.storageDomain.replace(/\/$/, '');
    const url = `${domain}/api/v1/file`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Storage upload failed: ${response.status} ${errorText}`);
      }

      // Info: (20260128 - Luphia) Parse the standard API response structure
      const result = await response.json();

      // Info: (20260128 - Luphia) External storage service might return 'OK' instead of 'SUCCESS'
      if (result.code !== ApiCode.SUCCESS && result.code !== 'OK') {
        throw new Error(result.message || 'Storage upload failed w/o message');
      }

      const payload = result.payload as IStorageUploadResponse;
      if (!payload || !payload.hash) {
        throw new Error('Storage upload response missing hash');
      }

      return payload.hash;

    } catch (error) {
      console.error('[StorageService] Error uploading file:', error);
      throw error;
    }
  }
  async uploadLaria(file: Blob | File): Promise<string> {
    const tempId = randomUUID();
    const tempDir = path.join(tmpdir(), "isunfa-upload", tempId);
    const inputPath = path.join(tempDir, "input_file");
    const outputDir = path.join(tempDir, "shards");

    try {
      // Info: (20260128 - Luphia) 1. Prepare temp directories
      await fs.mkdir(tempDir, { recursive: true });

      // Info: (20260128 - Luphia) 2. Write input file to disk
      const buffer = Buffer.from(await file.arrayBuffer());
      await fs.writeFile(inputPath, buffer);

      // Info: (20260128 - Luphia) 3. Encode file using Laria
      await encodeFile(inputPath, outputDir);

      // Info: (20260128 - Luphia) 4. Upload shards
      const shardHashes: string[] = [];
      const shardCount = 8; // Info: (20260128 - Luphia) We know Laria configuration is 5 + 3 = 8

      for (let i = 1; i <= shardCount; i++) {
        const shardName = `shard-${i}.bin`;
        const shardPath = path.join(outputDir, shardName);

        // Info: (20260128 - Luphia) Check if shard exists (it should)
        try {
          const shardBuffer = await fs.readFile(shardPath);
          const shardFile = new File([shardBuffer], shardName, {
            type: "application/octet-stream",
          });
          const hash = await this.uploadFile(shardFile);
          shardHashes.push(hash);
        } catch (e) {
          throw new Error(`Failed to upload shard ${i}: ${e}`);
        }
      }

      // Info: (20260128 - Luphia) 5. Process Metadata
      const metadataPath = path.join(outputDir, "metadata.json");
      const metadataBuffer = await fs.readFile(metadataPath);
      const metadata = JSON.parse(metadataBuffer.toString());

      // Info: (20260213 - Julian) Add shard hashes to metadata
      metadata.shards = shardHashes;

      /**
       * Info: (20260128 - Luphia) 6. Upload Metadata
       * Create a Blob/File from the updated metadata JSON
       */
      const updatedMetadataStr = JSON.stringify(metadata);
      const metadataFile = new File([updatedMetadataStr], "metadata.json", {
        type: "application/json",
      });
      const metadataHash = await this.uploadFile(metadataFile);

      return metadataHash;
    } catch (error) {
      console.error("[StorageService] Laria upload failed:", error);
      throw error;
    } finally {
      // Info: (20260128 - Luphia) 7. Cleanup
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch (e) {
        console.warn("Failed to clean up temp dir:", e);
      }
    }
  }

  /**
   * Info: (20260213 - Julian)
   * Recover a file using Laria shards.
   * @param metadataHash - The hash of the metadata file
   */
  async recoverLaria(metadataHash: string): Promise<Buffer> {
    const tempId = randomUUID();
    const tempDir = path.join(tmpdir(), "isunfa-download", tempId);
    const outputDir = path.join(tempDir, "shards");
    const recoveredPath = path.join(tempDir, "recovered_file");

    const domain = this.storageDomain.replace(/\/$/, "");

    try {
      await fs.mkdir(outputDir, { recursive: true });

      // 1. Download metadata
      const metadataRes = await fetch(`${domain}/api/v1/file/${metadataHash}`);
      if (!metadataRes.ok) {
        throw new Error(`Failed to fetch metadata: ${metadataRes.statusText}`);
      }
      const metadata = await metadataRes.json();
      // Info: (20260213 - Julian) 這裡假設 Storage 回傳的是原始 JSON 或 payload 包含原始 JSON
      // 根據之前的 API 慣例，這裡可能是 { code: 'SUCCESS', payload: { ... } }
      const metaObj = metadata.payload || metadata;

      const { shards, originalFileSize } = metaObj;
      if (!shards || typeof originalFileSize !== "number") {
        throw new Error("Invalid metadata format");
      }

      // 寫入 metadata.json (recoverFile 需要它)
      await fs.writeFile(
        path.join(outputDir, "metadata.json"),
        JSON.stringify({ originalFileSize }),
      );

      // 2. Download Shards
      for (let i = 0; i < shards.length; i++) {
        const shardHash = shards[i];
        const shardRes = await fetch(`${domain}/api/v1/file/${shardHash}`);
        if (!shardRes.ok) {
          throw new Error(`Failed to fetch shard ${i + 1}: ${shardRes.statusText}`);
        }
        const shardBuffer = Buffer.from(await shardRes.arrayBuffer());
        await fs.writeFile(
          path.join(outputDir, `shard-${i + 1}.bin`),
          shardBuffer,
        );
      }

      // 3. Recover
      const { recoverFile } = await import("@/lib/laria");
      await recoverFile(outputDir, recoveredPath);

      // 4. Read restored data
      return await fs.readFile(recoveredPath);
    } catch (error) {
      console.error("[StorageService] Laria recovery failed:", error);
      throw error;
    } finally {
      // 5. Cleanup
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch (e) {
        console.warn("Failed to clean up download temp dir:", e);
      }
    }
  }
}


export const storageService = new StorageService();
