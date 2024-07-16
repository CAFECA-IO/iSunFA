import prisma from '@/client';
import { IFolder } from '@/interfaces/folder';

export async function getFolderList(companyId: number): Promise<IFolder[]> {
  const folderList = await prisma.voucherSalaryRecordFolder.findMany({
    where: {
      companyId,
    },
  });
  const formattedFolderList = folderList.map((folder) => {
    return {
      id: folder.id,
      name: folder.name,
      createdAt: folder.createdAt,
    };
  });
  return formattedFolderList;
}
