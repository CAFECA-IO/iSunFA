import { describe, it, expect } from "@jest/globals";
import { readFileSync } from "fs";
import { join } from "path";
import {
  parseRetentionDays,
  resolveMemoryExpiresAt,
} from "@/lib/faith_memory/retention";
import { DEFAULT_FAITH_MEMORY_RETENTION_DAYS } from "@/constants/llm";

/**
 * Info: (20260818 - Luphia) 條款 §3.7 與隱私政策 §5 的「90 天後刪除」（第三輪 B-5）。
 *
 * 這個檔案補回本輪被覆蓋掉的覆蓋率：原本有 `parseRetentionDays`（6 case）與
 * `resolveMemoryExpiresAt`（2 case），整檔替換成 cron 的編排測試之後就沒了，
 * 而那兩支正是「90 天」這個承諾的唯一決定論來源。
 *
 * reviewer 指出的三個突變當時全部保持全綠，因為 retention 的測試把
 * repo 與 service 兩者整包 mock——剩下的只證明「編排正確」，
 * 不證明「被編排的東西正確」。這裡改測真的東西。
 */

describe("parseRetentionDays", () => {
  it("採用合法的天數設定", () => {
    expect(parseRetentionDays("30")).toBe(30);
    expect(parseRetentionDays("365")).toBe(365);
  });

  /**
   * Info: (20260818 - Luphia) 退回方向刻意選「會刪」而非「留著」：
   * 把 90 打成 90000 不該讓條款承諾要刪的資料永久留存。
   */
  it("超出範圍一律退回承諾值", () => {
    expect(parseRetentionDays("90000")).toBe(
      DEFAULT_FAITH_MEMORY_RETENTION_DAYS,
    );
    expect(parseRetentionDays("0")).toBe(DEFAULT_FAITH_MEMORY_RETENTION_DAYS);
    expect(parseRetentionDays("-1")).toBe(DEFAULT_FAITH_MEMORY_RETENTION_DAYS);
  });

  it("非純十進位整數一律退回承諾值", () => {
    expect(parseRetentionDays("abc")).toBe(DEFAULT_FAITH_MEMORY_RETENTION_DAYS);
    expect(parseRetentionDays("30.5")).toBe(
      DEFAULT_FAITH_MEMORY_RETENTION_DAYS,
    );
    expect(parseRetentionDays("")).toBe(DEFAULT_FAITH_MEMORY_RETENTION_DAYS);
  });

  it("未設定時回承諾值", () => {
    expect(parseRetentionDays(undefined)).toBe(
      DEFAULT_FAITH_MEMORY_RETENTION_DAYS,
    );
    expect(parseRetentionDays(null)).toBe(DEFAULT_FAITH_MEMORY_RETENTION_DAYS);
  });

  // Info: (20260818 - Luphia) 承諾值本身就是 90 天，改它等於改條款
  it("承諾值為 90 天", () => {
    expect(DEFAULT_FAITH_MEMORY_RETENTION_DAYS).toBe(90);
  });
});

describe("resolveMemoryExpiresAt", () => {
  const ENDED_AT = 1_760_000_000_000;

  it("到期日為終止日加上保留天數", () => {
    const expiresAt = resolveMemoryExpiresAt(ENDED_AT, 90);
    expect(expiresAt.getTime()).toBe(ENDED_AT + 90 * 86_400_000);
  });

  it("天數改變時到期日跟著改變", () => {
    expect(resolveMemoryExpiresAt(ENDED_AT, 30).getTime()).toBe(
      ENDED_AT + 30 * 86_400_000,
    );
  });
});

/**
 * Info: (20260818 - Luphia) 三個「保持全綠」的突變（第三輪 B-5）。
 *
 * 這些性質靠行為測試釘不住——repo 被 mock 就測不到 `delete` 是不是真的 delete，
 * 而守護行程有沒有被註冊更不在任何單元測試的視野內。以原始碼比對釘住，
 * 因為它們各自對應一句對外承諾：
 * - 條款寫的是「刪除」，soft delete 不算
 * - 條款寫的是「90 天」，而它的唯一來源是那個設定與 fail-safe
 * - 守護行程沒被註冊，前兩者寫得再好都不會執行
 */
describe("條款承諾的三個支點", () => {
  const read = (...parts: string[]) =>
    readFileSync(join(process.cwd(), ...parts), "utf8");

  it("刪除是硬刪除，不是 soft delete", () => {
    const repo = read("src", "repositories", "faith_memory.repo.ts");
    expect(repo).toMatch(/prisma\.faithMemory\.delete\(/);
    // Info: (20260818 - Luphia) 不允許用「清空密文」假裝刪除
    expect(repo).not.toMatch(/itemsCipher:\s*""/);
  });

  it("刪除與稽核列寫在同一個交易裡", () => {
    const repo = read("src", "repositories", "faith_memory.repo.ts");
    const tx = repo.indexOf("prisma.$transaction");
    const del = repo.indexOf("prisma.faithMemory.delete(");
    const log = repo.indexOf("faithMemoryDeletionLog.create");
    expect(tx).toBeGreaterThan(-1);
    expect(del).toBeGreaterThan(tx);
    expect(log).toBeGreaterThan(tx);
  });

  /**
   * Info: (20260818 - Luphia) 保留天數只能有一個算法（第三輪 B-5）。
   * 服務層原本自己再乘一次 86,400,000——而 `resolveMemoryExpiresAt` 的註解
   * 正好寫著「推導點一多，條款承諾的那個日期就會出現兩種算法」。
   */
  it("到期日只由 resolveMemoryExpiresAt 推導", () => {
    const service = read("src", "services", "faith_memory.service.ts");
    expect(service).toMatch(/resolveMemoryExpiresAt\(/);

    // Info: (20260818 - Luphia) 只看程式碼，註解裡引用舊寫法是說明用的
    const codeLines = service
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => !line.startsWith("*") && !line.startsWith("//"));
    expect(codeLines.join("\n")).not.toMatch(/86_400_000|86400000/);
  });

  it("保留期守護行程有註冊進 worker", () => {
    const worker = read("scripts", "run_worker.ts");
    expect(worker).toMatch(/runFaithMemoryRetention/);
    expect(worker).toMatch(/startServiceLoop\(\s*\n?\s*"FaithMemoryRetention"/);
  });
});
