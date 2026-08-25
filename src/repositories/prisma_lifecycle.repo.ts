import { prisma } from "@/lib/prisma";

/**
 * Info: (20260825 - Julian) 關閉連線池 —— 給一次性腳本用。
 *
 * ## 為什麼這一行要住在 Repository 層
 *
 * CLAUDE.md §1：Repository 是唯一碰得到 Prisma 的層級，而
 * `transaction_layering.test.ts` 把判準定成「有沒有 `import { prisma }`」。
 * 維運腳本跑完必須關掉連線池（不關的話 Node 的事件迴圈不會結束，
 * 腳本會掛在那裡），而那件事只能透過 client 做。
 *
 * 既存的腳本各自 import client 來呼叫 `$disconnect`，因此全部落在那支測試的
 * 既存違反白名單裡（**只縮不增**）。新的腳本不該再走那條路，所以把這一行
 * 收在這裡：**連線生命週期本來就是資料存取的事**，放在 Repository 層不是繞道。
 *
 * 它刻意只有一個函式。這個檔案不是「腳本專用的 prisma 出口」——
 * 需要查詢就去對應的 repo 加一支有名字的方法，那正是這條規則要換來的東西。
 */
export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}
