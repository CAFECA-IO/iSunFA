import prisma from '@/client';

export async function listProjectProgress(projectId: number): Promise<number> {
  let completedPercent = 0;
  if (projectId > 0) {
    const projectProgress = await prisma.project.findFirst({
      where: {
        id: projectId,
      },
      select: {
        completedPercent: true,
      },
    });
    if (projectProgress) {
      completedPercent = projectProgress.completedPercent;
    }
  }
  return completedPercent;
}
