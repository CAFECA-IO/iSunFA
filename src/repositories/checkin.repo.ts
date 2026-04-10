import { prisma } from "@/lib/prisma";

export class CheckinRepository {
  async getCheckinsByUserId(userId: string) {
    return prisma.checkin.findMany({
      where: { userId },
    });
  }
}

export const checkinRepo = new CheckinRepository();
