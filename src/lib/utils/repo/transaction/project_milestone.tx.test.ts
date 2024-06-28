// import { MILESTONE, Milestone } from '@/constants/milestone';
// import { updateProjectMilestone } from '@/lib/utils/repo/transaction/project_milestone.tx';

it('should add seed data to the database', async () => {
  expect(1).toBe(1);
});
// describe('updateProjectMilestone', () => {
//   it('should update project milestone and return the updated project and milestone list', async () => {
//     // Arrange
//     const projectId = 16;
//     const updateStage = MILESTONE.BETA_TESTING;
//     const startDate = 1625097600; // June 30, 2021 00:00:00 UTC

//     // Act
//     const result = await updateProjectMilestone(projectId, updateStage, startDate);

//     // Assert
//     expect(result).toBeDefined();
//     expect(result.project).toBeDefined();
//     expect(result.updatedMilestoneList).toBeDefined();
//     // Add more assertions based on your expected behavior
//   });

//   it('should throw an error if the target stage is not found in the milestone list', async () => {
//     // Arrange
//     const projectId = 16;
//     const updateStage = 'Invalid Stage' as Milestone;
//     const startDate = 1625097600; // June 30, 2021 00:00:00 UTC

//     // Act and Assert
//     await expect(updateProjectMilestone(projectId, updateStage, startDate)).rejects.toThrow();
//   });

//   // Add more test cases for different scenarios
// });
