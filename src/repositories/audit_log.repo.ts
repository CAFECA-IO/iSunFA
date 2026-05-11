import { prisma } from "@/lib/prisma";
import { Prisma, AuditLog } from "@/generated";
import { IAuditLogFilterOptions } from "@/interfaces/data_filter_option";
import { AuditLogAction, AuditLogDataType } from "@/constants/audit_log";

export interface ICreateAuditLogInput {
  userId: string;
  dataType: AuditLogDataType | string;
  dataId: string;
  accountBookId: string;
  action: AuditLogAction | string;
}

export interface IAuditLogRepository {
  createAuditLog(data: ICreateAuditLogInput): Promise<AuditLog>;
  createManyAuditLogs(
    data: ICreateAuditLogInput[],
  ): Promise<Prisma.BatchPayload>;
  getAuditLogs(options: IAuditLogFilterOptions): Promise<
    Prisma.AuditLogGetPayload<{
      include: { user: { select: { id: true; name: true; address: true } } };
    }>[]
  >;
  countAuditLogs(options: IAuditLogFilterOptions): Promise<number>;
}

export class AuditLogRepository implements IAuditLogRepository {
  async createAuditLog(data: ICreateAuditLogInput) {
    return prisma.auditLog.create({
      data: data as Prisma.AuditLogUncheckedCreateInput,
    });
  }

  async createManyAuditLogs(data: ICreateAuditLogInput[]) {
    return prisma.auditLog.createMany({
      data: data as Prisma.AuditLogCreateManyInput[],
    });
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
    });
  }

  async countAuditLogs(options: IAuditLogFilterOptions) {
    const where = this.buildWhereClause(options);
    return prisma.auditLog.count({ where });
  }
}

export const auditLogRepo = new AuditLogRepository();
