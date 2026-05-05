import { prisma } from "@/lib/prisma";
import { AuditLogDataType, Prisma } from "@/generated";
import { IAuditLogFilterOptions } from "@/interfaces/prisma_filter_option";
import { AuditLogAction } from "@/constants/audit_log";

export class AuditLogRepository {
  async createAuditLog(data: Prisma.AuditLogUncheckedCreateInput) {
    return prisma.auditLog.create({ data });
  }

  async createManyAuditLogs(data: Prisma.AuditLogCreateManyInput[]) {
    return prisma.auditLog.createMany({ data });
  }

  private buildWhereClause(
    options: IAuditLogFilterOptions,
  ): Prisma.AuditLogWhereInput {
    const where: Prisma.AuditLogWhereInput = {
      accountBookId: options.accountBookId,
    };

    // Info: (20260505 - Julian) 篩選關鍵字：可查詢 Log ID、操作人員的名稱和地址
    if (options.keyword) {
      where.OR = [
        { dataId: { contains: options.keyword } },
        { user: { name: { contains: options.keyword } } },
        { user: { address: { contains: options.keyword } } },
      ];
    }

    // Info: (20260505 - Julian) 篩選動作類型
    if (options.actionType) {
      where.action = options.actionType as AuditLogAction;
    }

    // Info: (20260505 - Julian) 篩選資料類型
    if (options.dataType) {
      where.dataType = options.dataType as AuditLogDataType;
    }

    // Info: (20260505 - Julian) 篩選時間區間
    if (options.startDate || options.endDate) {
      where.createdAt = {};
      if (options.startDate) {
        where.createdAt.gte = new Date(options.startDate);
      }
      if (options.endDate) {
        where.createdAt.lte = new Date(options.endDate);
      }
    }

    return where;
  }

  async getAuditLogs(options: IAuditLogFilterOptions) {
    const where = this.buildWhereClause(options);

    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    return prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
      },
    }) as unknown as Promise<
      Prisma.AuditLogGetPayload<{
        include: { user: { select: { id: true; name: true; address: true } } };
      }>[]
    >;
  }

  async countAuditLogs(options: IAuditLogFilterOptions) {
    const where = this.buildWhereClause(options);
    return prisma.auditLog.count({ where });
  }
}

export const auditLogRepo = new AuditLogRepository();
