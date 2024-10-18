import { IUser } from '@/interfaces/user';
import { User, UserAgreement, File } from '@prisma/client';

export function formatUser(
  user: User & {
    userAgreements: UserAgreement[];
    imageFile: File | null;
  }
): IUser {
  const agreementList = user.userAgreements.map((userAgreement) => userAgreement.agreementHash);
  const formattedUser: IUser = {
    ...user,
    email: user.email ?? '',
    imageId: user?.imageFile?.url ?? '',
    agreementList,
  };

  return formattedUser;
}

export async function formatUserList(
  userList: (User & { userAgreements: UserAgreement[]; imageFile: File | null })[]
): Promise<IUser[]> {
  const formattedUserList: IUser[] = userList.map((user) => {
    const formattedUser: IUser = formatUser(user);
    return formattedUser;
  });

  return formattedUserList;
}
