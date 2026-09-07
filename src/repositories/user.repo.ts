import { prisma } from "@/lib/prisma";
import { Prisma, User } from "@/generated";
import { IOAuthProfile } from "@/interfaces/oauth";
import { ISealedSecret } from "@/lib/auth/key_vault";

export interface ICreateSocialUserParams {
  address: string;
  name: string;
  imageUrl: string | null;
  credentialId: string;
  pubKeyX: string;
  pubKeyY: string;
  profile: IOAuthProfile;
  sealedPrivateKey: ISealedSecret;
}

export class UserRepository {
  async findMany(args?: Prisma.UserFindManyArgs) {
    return prisma.user.findMany(args);
  }

  /**
   * Info: (20260825 - Julian) 以 id 取單一使用者。
   *
   * 維運腳本要能分辨「這個 id 不存在」與「這個人沒有資料」，
   * 而 `findMany({ where: { id } })` 的空陣列同時是這兩件事。
   */
  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  }

  /**
   * Info: (20260809 - Luphia) 以第三方身分建立使用者。
   * User、UserIdentity、UserCustodialKey 三者必須同生共死：
   * 少了金鑰的 User 會是一個永遠簽不了名的孤兒帳號，因此包在同一個交易內。
   */
  async createSocialUser(params: ICreateSocialUserParams): Promise<User> {
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          address: params.address,
          credentialId: params.credentialId,
          pubKeyX: params.pubKeyX,
          pubKeyY: params.pubKeyY,
          name: params.name,
          imageUrl: params.imageUrl,
        },
      });

      await tx.userIdentity.create({
        data: {
          userId: user.id,
          provider: params.profile.provider,
          providerUserId: params.profile.providerUserId,
          email: params.profile.email,
          emailVerified: params.profile.emailVerified,
          displayName: params.profile.displayName,
          avatarUrl: params.profile.avatarUrl,
          lastLoginAt: new Date(),
        },
      });

      await tx.userCustodialKey.create({
        data: {
          userId: user.id,
          credentialId: params.credentialId,
          pubKeyX: params.pubKeyX,
          pubKeyY: params.pubKeyY,
          encryptedPrivateKey: params.sealedPrivateKey.ciphertext,
          iv: params.sealedPrivateKey.iv,
          authTag: params.sealedPrivateKey.authTag,
          keyVersion: params.sealedPrivateKey.keyVersion,
        },
      });

      return user;
    });
  }
}

export const userRepo = new UserRepository();
