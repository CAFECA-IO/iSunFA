import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Prisma } from "@/generated";
import { Pool } from "pg";
import * as dotenv from "dotenv";
import * as dotenvExpand from "dotenv-expand";

const env = dotenv.config();
dotenvExpand.expand(env);

const connectionString = `${process.env.DATABASE_URL}`;

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const basePrisma = new PrismaClient({ adapter });

// Info: (20260513 - Tzuhan) 企業級資料庫邊界防護 (Enterprise Database Boundary Guard)
// Info: (20260513 - Tzuhan) 動態解析 Prisma Schema，找出所有 BigInt、Decimal 與 Json 欄位名稱
const guardedFields = new Set<string>();
const jsonFields = new Set<string>();
Prisma.dmmf.datamodel.models.forEach((model) => {
  model.fields.forEach((f) => {
    if (f.type === "Decimal" || f.type === "BigInt") {
      guardedFields.add(f.name);
    }
    if (f.type === "Json") {
      jsonFields.add(f.name);
    }
  });
});

// Info: (20260513 - Tzuhan) 攔截所有 Prisma 寫入操作，嚴格阻擋原生 JS number 寫入這些欄位以防止精度遺失
const prisma = basePrisma.$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const writeOps = [
          "create",
          "update",
          "upsert",
          "createMany",
          "updateMany",
        ];
        if (writeOps.includes(operation) && args) {
          const argsRecord = args as Record<string, unknown>;
          if (argsRecord.data) {
            const checkNoNumber = (obj: unknown, isInsideJson = false) => {
              if (!obj || typeof obj !== "object") return;
              // Info: (20260513 - Tzuhan) 處理陣列 (例如 createMany)
              if (Array.isArray(obj)) {
                obj.forEach((item) => checkNoNumber(item, isInsideJson));
                return;
              }
              const record = obj as Record<string, unknown>;
              for (const key in record) {
                // Info: (20260514 - Tzuhan) 如果是在 Json 欄位內部，不應套用邊界防護，因為 Json 本來就允許 number
                if (
                  !isInsideJson &&
                  guardedFields.has(key) &&
                  typeof record[key] === "number"
                ) {
                  throw new Error(
                    `[Database Boundary Guard] Failed to save to ${model}: '${key}' is defined as Decimal/BigInt but received a primitive number. Please pass a string, Decimal instance, or BigInt to prevent silent precision loss.`,
                  );
                }
                if (typeof record[key] === "object") {
                  checkNoNumber(
                    record[key],
                    isInsideJson || jsonFields.has(key),
                  );
                }
              }
            };
            // Info: (20260514 - Tzuhan) 避免直接 iterate args.data 觸發 Prisma Proxy 的 Trap 導致 query 生成異常 (如空的 SET)
            const safeCloneStr = JSON.stringify(
              argsRecord.data,
              (key, value) => {
                if (typeof value === "bigint") return value.toString();
                return value;
              },
            );
            const safeClone = JSON.parse(safeCloneStr);
            checkNoNumber(safeClone);
          }
        }
        if (operation === 'findUnique' && model === 'Coefficient') {
          console.log('[DEBUG] findUnique args:', JSON.stringify(args));
        }
        return query(args);
      },
    },
  },
}) as unknown as typeof basePrisma;

// Info: (20260512 - Tzuhan) 徹底解決 Prisma BigInt 序列化災難，強制轉字串 (String Passing)
declare global {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  interface BigInt {
    toJSON(): string;
  }
}

if (typeof BigInt !== "undefined" && !BigInt.prototype.toJSON) {
  BigInt.prototype.toJSON = function () {
    return this.toString();
  };
}

export { prisma };
