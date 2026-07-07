import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated";

/**
 * Info: (20260706 - Luphia) 方案申請 Repository
 */
export class SolutionRepository {
  async createApplication(data: Prisma.SolutionApplicationCreateInput) {
    return prisma.solutionApplication.create({
      data,
    });
  }

  async findManyApplications(args?: Prisma.SolutionApplicationFindManyArgs) {
    return prisma.solutionApplication.findMany(args);
  }

  async countApplications(args?: Prisma.SolutionApplicationCountArgs) {
    return prisma.solutionApplication.count(args);
  }

  async listApplicationsPaginated(params: {
    page: number;
    limit: number;
    search?: string;
    solutionId?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  }) {
    const { page, limit, search, solutionId, status, sortBy, sortOrder } =
      params;

    const where: Prisma.SolutionApplicationWhereInput = {};

    if (search) {
      where.OR = [
        { companyName: { contains: search, mode: "insensitive" } },
        { taxId: { contains: search, mode: "insensitive" } },
        { contactPerson: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }

    if (solutionId && solutionId !== "ALL") {
      where.solutionId = solutionId;
    }

    if (status && status !== "ALL") {
      where.status = status;
    }

    const orderBy: Prisma.SolutionApplicationOrderByWithRelationInput = {};
    const direction = sortOrder === "asc" ? "asc" : "desc";

    if (sortBy === "createdAt") {
      orderBy.createdAt = direction;
    } else if (sortBy === "companyName") {
      orderBy.companyName = direction;
    } else {
      orderBy.createdAt = "desc";
    }

    const skip = (page - 1) * limit;

    const [totalElements, data] = await Promise.all([
      this.countApplications({ where }),
      this.findManyApplications({
        where,
        orderBy,
        skip,
        take: limit,
      }),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        totalElements,
        totalPages: Math.ceil(totalElements / limit),
      },
    };
  }

  async updateApplicationStatus(id: string, status: string) {
    return prisma.solutionApplication.update({
      where: { id },
      data: { status },
    });
  }
}

export const solutionRepo = new SolutionRepository();
