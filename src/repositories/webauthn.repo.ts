import { User, Prisma, Role } from "@/generated";
import { prisma } from "@/lib/prisma";
import { IUser } from "@/interfaces/user";

export interface IWebAuthnRepository {
  findUserByCredentialId(credentialId: string): Promise<IUser | null>;
  findUserByAddress(address: string): Promise<IUser | null>;
  findUserById(id: string): Promise<IUser | null>;
  findUsersByIds(ids: string[]): Promise<User[]>;
  findUserByName(name: string): Promise<User | null>;
  findAllUsersForAdmin(params: {
    page: number;
    limit: number;
    search?: string;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  }): Promise<{
    data: Array<{
      id: string;
      address: string;
      name: string | null;
      role: string;
      createdAt: Date;
    }>;
    pagination: {
      totalElements: number;
      totalPages: number;
      page: number;
      limit: number;
    };
  }>;
  updateChallenge(address: string, challenge: string): Promise<void>;
  clearChallenge(userId: string): Promise<void>;
  countUsers(): Promise<number>;
  upsertUser(data: {
    address: string;
    pubKeyX: string;
    pubKeyY: string;
    credentialId?: string;
    name?: string;
    imageUrl?: string;
  }): Promise<IUser>;
  clearSuperAdmins(): Promise<void>;
}

class WebAuthnRepository implements IWebAuthnRepository {
  // Info: (20260511 - Julian) 轉換格式
  private transformUserToIUser(user: User): IUser {
    return {
      id: user.id,
      address: user.address,
      pubKeyX: user.pubKeyX,
      pubKeyY: user.pubKeyY,
      credentialId: user.credentialId,
      name: user.name,
      imageUrl: user.imageUrl,
      role: user.role,
      currentChallenge: user.currentChallenge,
      identityAddress: user.identityAddress,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  public async findUserByCredentialId(
    credentialId: string,
  ): Promise<IUser | null> {
    const user = await prisma.user.findUnique({
      where: { credentialId },
    });

    if (!user) return null;

    return this.transformUserToIUser(user);
  }

  public async findUserByAddress(address: string): Promise<IUser | null> {
    const user = await prisma.user.findUnique({
      where: { address },
    });

    if (!user) return null;

    return this.transformUserToIUser(user);
  }

  public async findUserById(id: string): Promise<IUser | null> {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) return null;

    return this.transformUserToIUser(user);
  }

  public async findUsersByIds(ids: string[]): Promise<User[]> {
    return prisma.user.findMany({
      where: { id: { in: ids } },
    });
  }

  public async findUserByName(name: string): Promise<User | null> {
    return prisma.user.findFirst({
      where: { name },
    });
  }

  public async findAllUsersForAdmin({
    page = 1,
    limit = 15,
    search = "",
    sortBy = "createdAt",
    sortOrder = "desc",
  }: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  } = {}): Promise<{
    data: Array<{
      id: string;
      address: string;
      name: string | null;
      role: string;
      createdAt: Date;
    }>;
    pagination: {
      totalElements: number;
      totalPages: number;
      page: number;
      limit: number;
    };
  }> {
    const where: Prisma.UserWhereInput = search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { address: { contains: search, mode: "insensitive" } },
          ],
        }
      : {};

    const skip = (page - 1) * limit;

    const [totalElements, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          address: true,
          name: true,
          role: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      data: users,
      pagination: {
        totalElements,
        totalPages: Math.ceil(totalElements / limit),
        page,
        limit,
      },
    };
  }

  public async getUserWithPaymentMethods(
    userId: string,
  ): Promise<Prisma.UserGetPayload<{
    include: { paymentMethods: true };
  }> | null> {
    return prisma.user.findUnique({
      where: { id: userId },
      include: { paymentMethods: true },
    });
  }

  public async updateChallenge(
    address: string,
    challenge: string,
  ): Promise<void> {
    await prisma.user.update({
      where: { address },
      data: { currentChallenge: challenge },
    });
  }

  public async clearChallenge(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { currentChallenge: null },
    });
  }

  public async countUsers(): Promise<number> {
    return prisma.user.count();
  }

  public async updateKYCData(userId: string, data: JSON): Promise<User> {
    return prisma.user.update({
      where: { id: userId },
      data: { kycData: JSON.stringify(data) },
    });
  }

  public async updateIdentityAddress(
    userId: string,
    identityAddress: string,
  ): Promise<User> {
    return prisma.user.update({
      where: { id: userId },
      data: { identityAddress },
    });
  }

  // Info: (20251223 - Tzuhan) 用於 Indexer 或 Lazy Sync 寫入
  public async upsertUser(data: {
    address: string;
    pubKeyX: string;
    pubKeyY: string;
    credentialId?: string;
    name?: string;
    imageUrl?: string;
  }): Promise<IUser> {
    const user = await prisma.user.upsert({
      where: { address: data.address },
      update: {
        pubKeyX: data.pubKeyX,
        pubKeyY: data.pubKeyY,
        ...(data.credentialId
          ? { credentialId: data.credentialId, currentChallenge: null }
          : {}),
        ...(data.name ? { name: data.name } : {}),
        ...(data.imageUrl ? { imageUrl: data.imageUrl } : {}),
      },
      create: {
        address: data.address,
        pubKeyX: data.pubKeyX,
        pubKeyY: data.pubKeyY,
        credentialId: data.credentialId,
        name: data.name ?? `User ${data.address.slice(0, 6)}`,
        imageUrl: data.imageUrl ?? null,
      },
    });

    return this.transformUserToIUser(user);
  }

  public async clearSuperAdmins(): Promise<void> {
    await prisma.user.deleteMany({
      where: { role: Role.SUPER_ADMIN },
    });
  }
}

export const webAuthnRepo = new WebAuthnRepository();
