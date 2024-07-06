import {
  adjustMilestoneList,
  findLastMilestoneWithStartDate,
  calculateProjectCompletion,
  updateProjectMilestone,
} from '@/lib/utils/repo/transaction/project_milestone.tx';
import { timestampInSeconds } from '@/lib/utils/common';
import { listProjectMilestone } from '@/lib/utils/repo/milestone.repo';
import { formatMilestoneList } from '@/lib/utils/formatter/milestone.formatter';
import { IMilestone } from '@/interfaces/project';

let milestoneList: IMilestone[] = [];
const testProjectId = 1000;

beforeAll(async () => {
  const listedMilestone = await listProjectMilestone(testProjectId);
  milestoneList = formatMilestoneList(listedMilestone);
});

describe('Project Milestone Tests', () => {
  const defaultStage = 'Beta Testing';
  const updateStage = 'Sold';
  const now = Date.now();
  const nowTimestamp = timestampInSeconds(now);

  describe('adjustMilestoneList', () => {
    it('should adjust milestone list based on the update stage and start date', () => {
      const adjustedMilestones = adjustMilestoneList(milestoneList, updateStage, nowTimestamp);
      expect(adjustedMilestones).toBeDefined();
      expect(adjustedMilestones.some((milestone) => milestone.startDate === nowTimestamp)).toBe(
        true
      );
    });

    it('should throw an error if the update stage is not found', () => {
      const invalidStage = 'Nonexistent Stage';
      expect(() => adjustMilestoneList(milestoneList, invalidStage, nowTimestamp)).toThrow();
    });
  });

  describe('findLastMilestoneWithStartDate', () => {
    it('should find the last milestone with a start date', () => {
      const lastMilestone = findLastMilestoneWithStartDate(milestoneList);
      expect(lastMilestone).toBeDefined();
      expect(lastMilestone.startDate).toBeGreaterThan(0);
    });

    it('should throw an error if no milestones have a start date', () => {
      const milestonesWithoutStartDate = milestoneList.map((milestone) => ({
        ...milestone,
        startDate: 0,
      }));
      expect(() => findLastMilestoneWithStartDate(milestonesWithoutStartDate)).toThrow();
    });
  });

  describe('calculateProjectCompletion', () => {
    it('should calculate project completion percentage', () => {
      const completionPercentage = calculateProjectCompletion(milestoneList, updateStage);
      expect(completionPercentage).toBeDefined();
      expect(completionPercentage).toBeLessThanOrEqual(100);
    });
  });

  describe('updateProjectMilestone', () => {
    it('should update project milestone and return updated project and milestone list', async () => {
      const { project, updatedMilestoneList } = await updateProjectMilestone(
        testProjectId,
        milestoneList,
        updateStage,
        nowTimestamp
      );
      await updateProjectMilestone(testProjectId, milestoneList, defaultStage, nowTimestamp);
      expect(project).toBeDefined();
      expect(updatedMilestoneList).toBeDefined();
      expect(project.completedPercent).toBeLessThanOrEqual(100);
      expect(updatedMilestoneList.some((milestone) => milestone.startDate === nowTimestamp)).toBe(
        true
      );
    });
  });
});
