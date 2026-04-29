import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/client";

export class AuditLogRepository {
  async createAuditLog(data: Prisma.AuditLogUncheckedCreateInput) {
    return prisma.auditLog.create({ data });
  }

  async createManyAuditLogs(data: Prisma.AuditLogCreateManyInput[]) {
    return prisma.auditLog.createMany({ data });
  }

  async getAuditLogs(args: Prisma.AuditLogFindManyArgs) {
    return prisma.auditLog.findMany(args) as unknown as Promise<
      Prisma.AuditLogGetPayload<{
        include: { user: { select: { id: true; name: true; address: true } } };
      }>[]
    >;
  }

  async countAuditLogs(where: Prisma.AuditLogWhereInput) {
    return prisma.auditLog.count({ where });
  }
}

export const auditLogRepo = new AuditLogRepository();
