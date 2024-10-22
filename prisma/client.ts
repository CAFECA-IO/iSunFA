/* Info: (20241021 - Jacky)
 * This file implements a singleton pattern for PrismaClient.
 * The PrismaClient is cached in globalThis to avoid creating multiple instances,
 * especially in a development environment with frequent module reloads.
 * The PrismaClient is only instantiated once and reused throughout the application runtime.
 */

import { PrismaClient } from '@prisma/client';

// Info: (20241021 - Jacky) Singleton function that returns a new PrismaClient instance.
const prismaClientSingleton = () => new PrismaClient();

// Info: (20241021 - Jacky) Extend globalThis to include prismaGlobal for caching PrismaClient instance.
declare const globalThis: {
  prismaGlobal: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

// Info: (20241021 - Jacky) Check if prismaGlobal is already initialized, otherwise create a new PrismaClient.
const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

// Info: (20241021 - Jacky) Store the initialized PrismaClient in globalThis to cache it for future use.
globalThis.prismaGlobal = prisma;

export default prisma;
