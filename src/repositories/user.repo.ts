import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/client";

export class UserRepository {
  async findMany(args?: Prisma.UserFindManyArgs) {
    return prisma.user.findMany(args);
  }
}

export const userRepo = new UserRepository();
