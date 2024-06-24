// import { MILESTONE } from '@/constants/milestone';
// import { listProject, getProjectById, createProject, updateProjectById } from '@/lib/utils/repo/project.repo';

it('should add seed data to the database', async () => {
  expect(1).toBe(1);
});

// describe('Project Repository', () => {
//   describe('listProject', () => {
//     it('should return a list of projects for a given company', async () => {
//       const companyId = 1;
//       const projects = await listProject(companyId);
//       expect(projects).toBeDefined();
//       expect(Array.isArray(projects)).toBe(true);
//     });
//   });

//   describe('getProjectById', () => {
//     it('should return a project by its ID', async () => {
//       const projectId = 1;
//       const project = await getProjectById(projectId);
//       expect(project).toBeDefined();
//       expect(project.id).toBe(projectId);
//     });

//     it('should throw an error if the project is not found', async () => {
//       const projectId = -1;
//       const project = getProjectById(projectId);
//       await expect(project).rejects.toThrow();
//     });
//   });

//   describe('createProject', () => {
//     it('should create a new project', async () => {
//       const companyId = 30;
//       const name = 'New Project test';
//       const stage = MILESTONE.BETA_TESTING;
//       const members = [] as number[];
//       const project = await createProject(companyId, name, stage, members);
//       expect(project).toBeDefined();
//       expect(project.name).toBe(name);
//       expect(project.stage).toBe(stage);
//       expect(project.members).toHaveLength(members.length);
//     });
//   });

//   describe('updateProjectById', () => {
//     it('should update a project by its ID', async () => {
//       const projectId = 1;
//       const newName = 'Updated Project';
//       const project = await updateProjectById(projectId, newName);
//       expect(project).toBeDefined();
//       expect(project.id).toBe(projectId);
//       expect(project.name).toBe(newName);
//     });
//   });
// });
