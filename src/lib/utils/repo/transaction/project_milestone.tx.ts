import prisma from '@/client';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IMilestone } from '@/interfaces/project';
import { Project } from '@prisma/client';
import { timestampInSeconds } from '../../common';
import { listProjectMilestone } from '../milestone.repo';
import { formatMilestoneList } from '../../formatter/milestone.formatter';

function adjustMilestoneList(
  milestoneList: IMilestone[],
  updateStage: string,
  startDate: number
): IMilestone[] {
  const updatedMilestoneList = [...milestoneList];
  const { length } = updatedMilestoneList;

  const targetStageIndex = updatedMilestoneList.findIndex(
    (milestone) => milestone.status === updateStage
  );
  if (targetStageIndex === -1) {
    throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
  }
  updatedMilestoneList[targetStageIndex].startDate = startDate;
  for (let i = 0; i < length - 1; i += 1) {
    const currentStage = updatedMilestoneList[i];
    const targetStage = updatedMilestoneList[targetStageIndex];
    if (currentStage.startDate !== 0) {
      // Info (20240619 - Jacky) 這裡的判斷式是確保當前階段的 startDate 比目標階段的 startDate 早
      if (i < targetStageIndex && currentStage.startDate >= targetStage.startDate) {
        currentStage.startDate = 0;
      }
      if (i > targetStageIndex && currentStage.startDate <= targetStage.startDate) {
        currentStage.startDate = 0;
      }
    }
  }
  return updatedMilestoneList;
}

function findLastMilestoneWithStartDate(milestoneList: IMilestone[]): IMilestone {
  for (let i = milestoneList.length - 1; i >= 0; i -= 1) {
    if (milestoneList[i].startDate) {
      return milestoneList[i];
    }
  }
  throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
}

/**
 * 计算项目完成度
 * @param milestoneList 项目里程碑列表
 * @param currentStage 当前阶段的状态
 * @returns 完成度 (百分比)
 */
function calculateProjectCompletion(milestoneList: IMilestone[], currentStage: string): number {
  const totalStages = milestoneList.length;

  const completedStages = milestoneList.reduce((count, milestone) => {
    return milestone.status === currentStage ? count : count + 1;
  }, 0);

  const completionPercentage = (completedStages / totalStages) * 100;

  return completionPercentage;
}

export async function updateProjectMilestone(
  projectId: number,
  updateStage: string,
  startDate?: number
): Promise<{ project: Project; updatedMilestoneList: IMilestone[] }> {
  const listedMilestone = await listProjectMilestone(projectId);
  const milestoneList = formatMilestoneList(listedMilestone);
  const now = Date.now();
  const nowTimestamp = timestampInSeconds(now);
  const updateStartDate = startDate ?? nowTimestamp;
  const updatedMilestoneList = adjustMilestoneList(milestoneList, updateStage, updateStartDate);
  const projectStage = findLastMilestoneWithStartDate(updatedMilestoneList);
  const completedPercent = calculateProjectCompletion(updatedMilestoneList, projectStage.status);
  const project = await prisma.project.update({
    where: {
      id: projectId,
    },
    data: {
      milestones: {
        set: updatedMilestoneList,
      },
      stage: projectStage.status,
      completedPercent,
      updatedAt: nowTimestamp,
    },
  });
  return { project, updatedMilestoneList };
}
