import dotenv from "dotenv";
import { expand } from "dotenv-expand";
import { defineConfig } from "prisma/config";

const env = dotenv.config();
expand(env);

export default defineConfig({
  schema: "prisma/schema.prisma",
  /**
   * Info: (20260831 - Emily) `prisma/migrations` 這個目錄在本 repo **不存在** ——
   * schema 以 `db push` 套用(設計書 §5.3),沒有 migrations 流程。
   * `db push` 不讀這個欄位,所以留著無害;但 #6577 把本檔納入型別檢查等於接手了它,
   * 而下一個人看到這一行會以為本 repo 有 migrations 流程。
   * 不直接刪:改用 `migrate` 的那一天它就是對的,而刪掉會讓那天的人重新猜路徑。
   */
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
