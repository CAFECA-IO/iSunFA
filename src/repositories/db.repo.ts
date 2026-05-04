import { prisma } from "@/lib/prisma";

export const dbRepo = {
  async checkConnection(): Promise<void> {
    await prisma.user.findFirst();
  },
  disconnect(): Promise<void> {
    return prisma.$disconnect();
  },
};
