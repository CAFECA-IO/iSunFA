import prisma from '@/client';
import { IValue } from '@/interfaces/project';

export async function getProjectValue(projectId: number): Promise<IValue | null> {
  let value: IValue | null = null;
  if (projectId > 0) {
    value = await prisma.value.findUnique({
      where: {
        projectId,
      },
    });
  }
  return value;
}
