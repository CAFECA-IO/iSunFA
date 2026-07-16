// Info: (20260715 - Emily) Laria 真 Reed-Solomon 測試:GF 抹除重建正確性 + encode/recover 檔案管線 + 舊檔降級

import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { promises as fs } from "fs";
import path from "path";
import { tmpdir } from "os";
import { randomUUID, randomBytes, createHash } from "crypto";
import { ReedSolomonErasure } from "@/lib/reed_solomon_erasure";
import {
  encodeFile,
  recoverFile,
  DATA_SHARDS,
  PARITY_SHARDS,
  TOTAL_SHARDS,
  LARIA_RS_VERSION,
} from "@/lib/laria";

const SHARD_BYTES = 1024;

const buildShards = (): { data: Buffer[]; shards: Buffer[] } => {
  const data = Array.from({ length: DATA_SHARDS }, () =>
    randomBytes(SHARD_BYTES),
  );
  const shards = [
    ...data.map((d) => Buffer.from(d)),
    ...Array.from({ length: PARITY_SHARDS }, () => Buffer.alloc(SHARD_BYTES)),
  ];
  return { data, shards };
};

describe("ReedSolomonErasure", () => {
  it("should produce deterministic parity for identical input", async () => {
    const { data } = buildShards();
    const rse = new ReedSolomonErasure(DATA_SHARDS, PARITY_SHARDS);
    const encodeOnce = async (): Promise<Buffer[]> => {
      const shards = [
        ...data.map((d) => Buffer.from(d)),
        ...Array.from({ length: PARITY_SHARDS }, () =>
          Buffer.alloc(SHARD_BYTES),
        ),
      ];
      await rse.encode(shards);
      return shards.slice(DATA_SHARDS);
    };
    const parityA = await encodeOnce();
    const parityB = await encodeOnce();
    parityA.forEach((p, i) => expect(p.equals(parityB[i])).toBe(true));
  });

  it("should reconstruct bit-perfectly with up to PARITY_SHARDS random erasures", async () => {
    const rse = new ReedSolomonErasure(DATA_SHARDS, PARITY_SHARDS);
    // Info: (20260715 - Emily) 隨機抹除 property-based:50 回合 × 1~3 個任意位置
    for (let trial = 0; trial < 50; trial++) {
      const { shards } = buildShards();
      await rse.encode(shards);
      const original = shards.map((s) => Buffer.from(s));

      const eraseCount = 1 + (trial % PARITY_SHARDS);
      const indices = [...Array(TOTAL_SHARDS).keys()]
        .sort(() => Math.random() - 0.5)
        .slice(0, eraseCount);
      const damaged: (Buffer | null)[] = original.map((s, i) =>
        indices.includes(i) ? null : Buffer.from(s),
      );

      await rse.reconstruct(damaged);
      for (let i = 0; i < TOTAL_SHARDS; i++) {
        expect((damaged[i] as Buffer).equals(original[i])).toBe(true);
      }
    }
  });

  it("should throw when erasures exceed parity capacity", async () => {
    const rse = new ReedSolomonErasure(DATA_SHARDS, PARITY_SHARDS);
    const { shards } = buildShards();
    await rse.encode(shards);
    const damaged: (Buffer | null)[] = shards.map((s, i) =>
      i < PARITY_SHARDS + 1 ? null : Buffer.from(s),
    );
    await expect(rse.reconstruct(damaged)).rejects.toThrow(/need 5 shards/);
  });

  it("should reject mismatched shard lengths and wrong shard counts", async () => {
    const rse = new ReedSolomonErasure(DATA_SHARDS, PARITY_SHARDS);
    const { shards } = buildShards();
    shards[1] = Buffer.alloc(SHARD_BYTES + 1);
    await expect(rse.encode(shards)).rejects.toThrow(/identical length/);
    await expect(rse.encode(shards.slice(0, 3))).rejects.toThrow(/expects 8/);
  });
});

describe("encodeFile / recoverFile", () => {
  let workDir: string;
  let inputPath: string;
  let shardsDir: string;
  let recoveredPath: string;

  beforeEach(async () => {
    workDir = path.join(tmpdir(), "laria-test", randomUUID());
    await fs.mkdir(workDir, { recursive: true });
    inputPath = path.join(workDir, "input.bin");
    shardsDir = path.join(workDir, "shards");
    recoveredPath = path.join(workDir, "recovered.bin");
  });

  afterEach(async () => {
    await fs.rm(workDir, { recursive: true, force: true });
  });

  const readMetadata = async (): Promise<Record<string, unknown>> =>
    JSON.parse(
      (await fs.readFile(path.join(shardsDir, "metadata.json"))).toString(),
    );

  const writeMetadata = async (meta: Record<string, unknown>): Promise<void> =>
    fs.writeFile(path.join(shardsDir, "metadata.json"), JSON.stringify(meta));

  // Info: (20260715 - Emily) 1.5MB 非 stripe 整數倍 → 覆蓋 padding 路徑
  const prepareEncodedFile = async (size = 1_500_000): Promise<Buffer> => {
    const content = randomBytes(size);
    await fs.writeFile(inputPath, content);
    await encodeFile(inputPath, shardsDir);
    return content;
  };

  it("should roundtrip and write v2 metadata with sha256", async () => {
    const content = await prepareEncodedFile();
    const meta = await readMetadata();
    expect(meta.rsVersion).toBe(LARIA_RS_VERSION);
    expect(meta.sha256).toBe(
      createHash("sha256").update(content).digest("hex"),
    );

    await recoverFile(shardsDir, recoveredPath);
    expect((await fs.readFile(recoveredPath)).equals(content)).toBe(true);
  });

  it("should recover bit-perfectly with 3 shards deleted (including data shards)", async () => {
    const content = await prepareEncodedFile();
    // Info: (20260715 - Emily) 最壞情境:抹掉 3 個資料切片
    await fs.rm(path.join(shardsDir, "shard-1.bin"));
    await fs.rm(path.join(shardsDir, "shard-3.bin"));
    await fs.rm(path.join(shardsDir, "shard-5.bin"));

    await recoverFile(shardsDir, recoveredPath);
    expect((await fs.readFile(recoveredPath)).equals(content)).toBe(true);
  });

  it("should fail explicitly with 4 shards deleted", async () => {
    await prepareEncodedFile();
    await Promise.all(
      [1, 2, 3, 6].map((i) => fs.rm(path.join(shardsDir, `shard-${i}.bin`))),
    );
    await expect(recoverFile(shardsDir, recoveredPath)).rejects.toThrow(
      /只找到 4 個/,
    );
  });

  it("should detect content corruption via sha256 even when all shards are present", async () => {
    await prepareEncodedFile();
    const shardPath = path.join(shardsDir, "shard-2.bin");
    const shard = await fs.readFile(shardPath);
    shard[42] ^= 0xff;
    await fs.writeFile(shardPath, shard);

    await expect(recoverFile(shardsDir, recoveredPath)).rejects.toThrow(
      /完整性驗證失敗/,
    );
  });

  describe("legacy files (fake zero parity, no rsVersion)", () => {
    const downgradeToLegacy = async (): Promise<void> => {
      const meta = await readMetadata();
      await writeMetadata({
        originalFileSize: meta.originalFileSize,
        shardSize: meta.shardSize,
      });
      // Info: (20260715 - Emily) 模擬舊模擬實作:parity 全部歸零(尺寸沿用真實 parity 檔)
      await Promise.all(
        Array.from({ length: PARITY_SHARDS }, async (_, j) => {
          const parityPath = path.join(
            shardsDir,
            `shard-${DATA_SHARDS + j + 1}.bin`,
          );
          const { size } = await fs.stat(parityPath);
          await fs.writeFile(parityPath, Buffer.alloc(size));
        }),
      );
    };

    it("should still recover when all data shards are present", async () => {
      const content = await prepareEncodedFile();
      await downgradeToLegacy();
      await recoverFile(shardsDir, recoveredPath);
      expect((await fs.readFile(recoveredPath)).equals(content)).toBe(true);
    });

    it("should fail explicitly (not return corrupted zeros) when a data shard is missing", async () => {
      await prepareEncodedFile();
      await downgradeToLegacy();
      await fs.rm(path.join(shardsDir, "shard-2.bin"));
      await expect(recoverFile(shardsDir, recoveredPath)).rejects.toThrow(
        /遺失資料切片/,
      );
    });
  });

  it("should throw on empty input file (fail fast)", async () => {
    await fs.writeFile(inputPath, Buffer.alloc(0));
    await expect(encodeFile(inputPath, shardsDir)).rejects.toThrow(
      /檔案不存在或是空的/,
    );
  });
});
