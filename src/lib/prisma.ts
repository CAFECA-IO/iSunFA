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

export { prisma };
