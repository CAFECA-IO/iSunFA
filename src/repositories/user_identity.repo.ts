// Info: (20260809 - Luphia) 第三方身分綁定資料存取層（唯一碰 Prisma）；不含任何業務判斷
import { Prisma, UserIdentity } from "@/generated";
import { prisma } from "@/lib/prisma";
import { AuthProvider } from "@/constants/auth_provider";
import { IOAuthProfile } from "@/interfaces/oauth";

export interface IUserIdentityRepository {
  findByProviderUserId(
    provider: AuthProvider,
    providerUserId: string,
  ): Promise<UserIdentity | null>;
  findByUserId(userId: string): Promise<UserIdentity[]>;
  create(
    userId: string,
    profile: IOAuthProfile,
    tx?: Prisma.TransactionClient,
  ): Promise<UserIdentity>;
  touchLogin(id: string, profile: IOAuthProfile): Promise<UserIdentity>;
  deleteByUserAndProvider(
    userId: string,
    provider: AuthProvider,
  ): Promise<number>;
}

class UserIdentityRepository implements IUserIdentityRepository {
  public async findByProviderUserId(
    provider: AuthProvider,
    providerUserId: string,
  ): Promise<UserIdentity | null> {
    return prisma.userIdentity.findUnique({
      where: { provider_providerUserId: { provider, providerUserId } },
    });
  }

  public async findByUserId(userId: string): Promise<UserIdentity[]> {
    return prisma.userIdentity.findMany({ where: { userId } });
  }

  public async create(
    userId: string,
    profile: IOAuthProfile,
    tx?: Prisma.TransactionClient,
  ): Promise<UserIdentity> {
    const client = tx ?? prisma;
    return client.userIdentity.create({
      data: {
        userId,
        provider: profile.provider,
        providerUserId: profile.providerUserId,
        email: profile.email,
        emailVerified: profile.emailVerified,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
        lastLoginAt: new Date(),
      },
    });
  }

  /**
   * Info: (20260809 - Luphia) 每次登入都把 provider 端最新的 email / 頭像同步回來，
   * 使用者在 Google 改名或換頭像後，這裡才不會停留在註冊當下的快照。
   */
  public async touchLogin(
    id: string,
    profile: IOAuthProfile,
  ): Promise<UserIdentity> {
    return prisma.userIdentity.update({
      where: { id },
      data: {
        email: profile.email,
        emailVerified: profile.emailVerified,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
        lastLoginAt: new Date(),
      },
    });
  }

  public async deleteByUserAndProvider(
    userId: string,
    provider: AuthProvider,
  ): Promise<number> {
    const result = await prisma.userIdentity.deleteMany({
      where: { userId, provider },
    });
    return result.count;
  }
}

export const userIdentityRepo = new UserIdentityRepository();
