import { IUser } from '@/interfaces/user';
import { User } from '@prisma/client';

export function formatUser(user: User): IUser {
  const formattedUser: IUser = {
    ...user,
    fullName: user.fullName ?? '',
    email: user.email ?? '',
    phone: user.phone ?? '',
    imageId: user.imageId ?? '',
  };

  return formattedUser;
}

export async function formatUserList(userList: User[]): Promise<IUser[]> {
  const formattedUserList: IUser[] = userList.map((user) => {
    const formattedUser: IUser = formatUser(user);
    return formattedUser;
  });

  return formattedUserList;
}
