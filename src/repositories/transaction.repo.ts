import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated";

export class TransactionRepo {
  static async run<T>(
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return prisma.$transaction(fn);
  }
}
