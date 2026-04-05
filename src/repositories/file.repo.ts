import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/client";

export class FileRepository {
  async getFileById(id: string) {
    return prisma.file.findUnique({
      where: { id },
    });
  }

  async deleteFile(id: string) {
    return prisma.file.delete({
      where: { id },
    });
  }

  async createFile(data: Prisma.FileCreateInput) {
    return prisma.file.create({
      data,
    });
  }
}

export const fileRepo = new FileRepository();
