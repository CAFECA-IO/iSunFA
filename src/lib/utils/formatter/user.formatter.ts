import { IUser } from '@/interfaces/user';
import { User } from '@prisma/client';

export async function formatUserList(userList: User[]): Promise<IUser[]> {
  const formattedUserList: IUser[] = userList.map((user) => {
    const formattedUser: IUser = {
      ...user,
      fullName: user.fullName ?? '',
      email: user.email ?? '',
      phone: user.phone ?? '',
      imageId: user.imageId ?? '',
    };
    return formattedUser;
  });

  return formattedUserList;
}

export async function formatUser(user: User): Promise<IUser> {
  const formattedUser: IUser = {
    ...user,
    fullName: user.fullName ?? '',
    email: user.email ?? '',
    phone: user.phone ?? '',
    imageId: user.imageId ?? '',
  };

  return formattedUser;
}
