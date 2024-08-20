import { IUser } from '@/interfaces/user';
import { User, UserAgreement } from '@prisma/client';

export function formatUser(user: User & { userAgreements: UserAgreement[] }): IUser {
  const agreementList = user.userAgreements.map((userAgreement) => userAgreement.agreementHash);
  const formattedUser: IUser = {
    ...user,
    fullName: user.fullName ?? '',
    email: user.email ?? '',
    phone: user.phone ?? '',
    imageId: user.imageId ?? '',
    agreementList,
  };

  return formattedUser;
}

export async function formatUserList(
  userList: (User & { userAgreements: UserAgreement[] })[]
): Promise<IUser[]> {
  const formattedUserList: IUser[] = userList.map((user) => {
    const formattedUser: IUser = formatUser(user);
    return formattedUser;
  });

  return formattedUserList;
}
