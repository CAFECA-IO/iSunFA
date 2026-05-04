import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated";

export class CheckinRepository {
  async getCheckinsByUserId(userId: string) {
    return prisma.checkin.findMany({
      where: { userId },
    });
  }

  async findFirst<T extends Prisma.CheckinFindFirstArgs>(
    args: Prisma.SelectSubset<T, Prisma.CheckinFindFirstArgs>,
  ) {
    return prisma.checkin.findFirst(args);
  }

  async create<T extends Prisma.CheckinCreateArgs>(
    args: Prisma.SelectSubset<T, Prisma.CheckinCreateArgs>,
  ) {
    return prisma.checkin.create(args);
  }
}

export const checkinRepo = new CheckinRepository();
