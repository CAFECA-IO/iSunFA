import { IInvitation } from '@/interfaces/invitation';

export function isIInvitation(obj: IInvitation): obj is IInvitation {
  const isValid =
    typeof obj.id === 'number' &&
    typeof obj.roleId === 'number' &&
    typeof obj.companyId === 'number' &&
    typeof obj.createdUserId === 'number' &&
    typeof obj.code === 'string' &&
    typeof obj.email === 'string' &&
    (typeof obj.phone === 'string' || obj.phone === null) &&
    typeof obj.hasUsed === 'boolean' &&
    typeof obj.expiredAt === 'number' &&
    typeof obj.createdAt === 'number' &&
    typeof obj.updatedAt === 'number';

  if (!isValid) {
    throw new Error('Invalid IInvitation object');
  }

  return isValid;
}
