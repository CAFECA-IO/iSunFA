import * as dotenv from 'dotenv';
import * as dotenvExpand from 'dotenv-expand';

const myEnv = dotenv.config();
dotenvExpand.expand(myEnv);

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/client';

const connectionString = `${process.env.DATABASE_URL}`;

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

export { prisma };
