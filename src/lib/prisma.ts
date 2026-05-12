import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated";
import { Pool } from "pg";
import * as dotenv from "dotenv";
import * as dotenvExpand from "dotenv-expand";

const env = dotenv.config();
dotenvExpand.expand(env);

const connectionString = `${process.env.DATABASE_URL}`;

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

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
