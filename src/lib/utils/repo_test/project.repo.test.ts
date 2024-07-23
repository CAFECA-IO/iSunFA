import { MILESTONE } from '@/constants/milestone';
import {
  listProject,
  getProjectById,
  createProject,
  updateProjectById,
  deleteProjectByIdForTest,
} from '@/lib/utils/repo/project.repo';
import projects from '@/seed_json/project.json';

describe('Project Repository', () => {
  describe('listProject', () => {
    it('should return a list of projects for a given company', async () => {
      const companyId = 1000;
      const listedProject = await listProject(companyId);
      expect(listedProject).toBeDefined();
      expect(Array.isArray(listedProject)).toBe(true);
      expect(listedProject[0].companyId).toBe(projects[0].companyId);
      expect(listedProject[0].name).toContain(projects[0].name);
      expect(listedProject[0].stage).toBe(projects[0].stage);
      expect(listedProject[0].createdAt).toBe(projects[0].createdAt);
      expect(listedProject[0].completedPercent).toBe(projects[0].completedPercent);
    });
  });

  describe('getProjectById', () => {
    it('should return a project by its ID', async () => {
      const projectId = 1000;
      const project = await getProjectById(projectId);

      // Assert that project is defined
      expect(project).toBeDefined();
      expect(project).toBeTruthy();

      // TypeScript now knows project is defined, no need for optional chaining
      expect(project!.id).toBe(projectId);
      expect(project!.companyId).toBe(projects[0].companyId);
      expect(project!.name).toContain(projects[0].name);
      expect(project!.stage).toBe(projects[0].stage);
      expect(project!.createdAt).toBe(projects[0].createdAt);
      expect(project!.completedPercent).toBe(projects[0].completedPercent);
    });

    it('should throw an error if the project is not found', async () => {
      const projectId = -1;
      const project = await getProjectById(projectId);
      expect(project).toBeNull();
    });
  });

  describe('createProject', () => {
    it('should create a new project', async () => {
      const companyId = 1000;
      const name = 'New Test Project';
      const stage = MILESTONE.BETA_TESTING;
      const members = [] as number[];
      const project = await createProject(companyId, name, stage, members);
      await deleteProjectByIdForTest(project.id);
      expect(project).toBeDefined();
      expect(project.name).toBe(name);
      expect(project.stage).toBe(stage);
      expect(project.employeeProjects).toHaveLength(members.length);
    });
  });

  describe('updateProjectById', () => {
    it('should update a project by its ID', async () => {
      const date = Date.now();
      const projectId = 1000;
      const newName = 'Test Project' + date;
      const project = await updateProjectById(projectId, newName);
      expect(project).toBeDefined();
      expect(project.id).toBe(projectId);
      expect(project.name).toBe(newName);
    });
  });
});
