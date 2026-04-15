import { PrismaClient, Role, User, Prisma } from "@/generated/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

export class SetupRepository {
  private async getPrisma(dbUrl: string): Promise<PrismaClient> {
    const pool = new Pool({ connectionString: dbUrl });
    const adapter = new PrismaPg(pool);
    return new PrismaClient({ adapter });
  }

  public async findSuperAdmin(dbUrl: string): Promise<User | null> {
    const prisma = await this.getPrisma(dbUrl);
    try {
      return await prisma.user.findFirst({
        where: { role: Role.SUPER_ADMIN },
      });
    } finally {
      await prisma.$disconnect();
    }
  }

  public async deleteUserByAddress(
    dbUrl: string,
    address: string,
  ): Promise<void> {
    const prisma = await this.getPrisma(dbUrl);
    try {
      await prisma.user.delete({ where: { address } });
    } finally {
      await prisma.$disconnect();
    }
  }

  public async upsertSuperAdmin(
    dbUrl: string,
    data: {
      address: string;
      credentialId: string;
      pubKeyX: string;
      pubKeyY: string;
      name: string;
    },
  ): Promise<void> {
    const prisma = await this.getPrisma(dbUrl);
    try {
      const existing = await prisma.user.findFirst({
        where: { role: Role.SUPER_ADMIN },
      });
      if (existing) {
        await prisma.user.update({
          where: { id: existing.id },
          data: {
            credentialId: data.credentialId,
            pubKeyX: data.pubKeyX,
            pubKeyY: data.pubKeyY,
          },
        });
      } else {
        await prisma.user.create({
          data: {
            address: data.address,
            role: Role.SUPER_ADMIN,
            credentialId: data.credentialId,
            pubKeyX: data.pubKeyX,
            pubKeyY: data.pubKeyY,
            name: data.name,
          },
        });
      }
    } finally {
      await prisma.$disconnect();
    }
  }

  public async upsertSuperAdminByAddress(
    dbUrl: string,
    data: {
      address: string;
      credentialId: string;
      pubKeyX: string;
      pubKeyY: string;
      name: string;
    },
  ): Promise<void> {
    const prisma = await this.getPrisma(dbUrl);
    try {
      await prisma.user.upsert({
        where: { address: data.address.toLowerCase() },
        update: { role: Role.SUPER_ADMIN },
        create: {
          address: data.address.toLowerCase(),
          role: Role.SUPER_ADMIN,
          credentialId: data.credentialId,
          pubKeyX: data.pubKeyX,
          pubKeyY: data.pubKeyY,
          name: data.name,
        },
      });
    } finally {
      await prisma.$disconnect();
    }
  }

  public async findAdmins(dbUrl: string): Promise<User[]> {
    const prisma = await this.getPrisma(dbUrl);
    try {
      const admins = await prisma.user.findMany({
        where: { role: { in: [Role.ADMIN, Role.SUPER_ADMIN] } },
        orderBy: [{ role: "asc" }, { createdAt: "asc" }],
      });
      return admins;
    } finally {
      await prisma.$disconnect();
    }
  }

  public async findUserByAddress(
    dbUrl: string,
    address: string,
  ): Promise<User | null> {
    const prisma = await this.getPrisma(dbUrl);
    try {
      return await prisma.user.findUnique({ where: { address } });
    } finally {
      await prisma.$disconnect();
    }
  }

  public async findUserByCredentialId(
    dbUrl: string,
    credentialId: string,
  ): Promise<User | null> {
    const prisma = await this.getPrisma(dbUrl);
    try {
      return await prisma.user.findUnique({ where: { credentialId } });
    } finally {
      await prisma.$disconnect();
    }
  }

  public async updateUserRole(
    dbUrl: string,
    address: string,
    role: Role,
  ): Promise<void> {
    const prisma = await this.getPrisma(dbUrl);
    try {
      await prisma.user.update({
        where: { address },
        data: { role },
      });
    } finally {
      await prisma.$disconnect();
    }
  }

  public async downgradeAllAdminsToNormal(dbUrl: string): Promise<void> {
    const prisma = await this.getPrisma(dbUrl);
    try {
      await prisma.user.updateMany({
        where: { role: Role.ADMIN },
        data: { role: Role.USER },
      });
    } finally {
      await prisma.$disconnect();
    }
  }

  public async downgradeAllSuperAdminsToUser(dbUrl: string): Promise<void> {
    const prisma = await this.getPrisma(dbUrl);
    try {
      await prisma.user.updateMany({
        where: { role: Role.SUPER_ADMIN },
        data: { role: Role.USER },
      });
    } finally {
      await prisma.$disconnect();
    }
  }

  public async createUser(
    dbUrl: string,
    data: Prisma.UserCreateInput,
  ): Promise<User> {
    const prisma = await this.getPrisma(dbUrl);
    try {
      return await prisma.user.create({ data });
    } finally {
      await prisma.$disconnect();
    }
  }

  public async updateUser(
    dbUrl: string,
    address: string,
    data: Prisma.UserUpdateInput,
  ): Promise<User> {
    const prisma = await this.getPrisma(dbUrl);
    try {
      return await prisma.user.update({
        where: { address },
        data,
      });
    } finally {
      await prisma.$disconnect();
    }
  }

  public async clearAllSuperAdmins(dbUrl: string): Promise<void> {
    const prisma = await this.getPrisma(dbUrl);
    try {
      await prisma.user.deleteMany({
        where: { role: { in: [Role.SUPER_ADMIN, Role.ADMIN] } },
      });
    } finally {
      await prisma.$disconnect();
    }
  }
}

export const setupRepo = new SetupRepository();
