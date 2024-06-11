import { formatProjectList, formatProject } from '@/lib/utils/formatter/project.formatter';

describe('formatProject', () => {
  it('should format the project list correctly', async () => {
    const listedProject = [
      {
        id: 1,
        name: 'Project 1',
        companyId: 1,
        completedPercent: 30,
        stage: 'Stage 1',
        imageId: '1',
        totalExpense: 1000,
        totalIncome: 2000,
        createdAt: 1241412421,
        updatedAt: 1241412421,
        employeeProjects: [
          { employee: { id: 1, name: 'Employee 1', imageId: '3' } },
          { employee: { id: 2, name: 'Employee 2', imageId: '4' } },
        ],
        values: [
          { id: 1, totalExpense: 1000, totalRevenue: 2000, netProfit: 1000 },
          { id: 2, totalExpense: 1500, totalRevenue: 2500, netProfit: 1000 },
        ],
        _count: { contracts: 2 },
      },
      // Add more test cases here if needed
    ];

    const projectList = await formatProjectList(listedProject);

    const expectedProjectList = [
      {
        id: 1,
        name: 'Project 1',
        companyId: 1,
        completedPercent: 30,
        stage: 'Stage 1',
        imageId: '1',
        totalExpense: 1000,
        totalIncome: 2000,
        createdAt: 1241412421,
        updatedAt: 1241412421,
        members: [
          { id: 1, name: 'Employee 1', imageId: '3' },
          { id: 2, name: 'Employee 2', imageId: '4' },
        ],
        income: 1500,
        expense: 2500,
        profit: 1000,
        contractAmount: 2,
      },
      // Add expected results for other test cases here
    ];
    // Add assertions to verify the formatted project list
    expect(projectList).toEqual(expectedProjectList);
  });

  it('should format the project correctly', async () => {
    const getProject = {
      id: 1,
      name: 'Project 1',
      companyId: 1,
      completedPercent: 30,
      stage: 'Stage 1',
      imageId: '1',
      totalExpense: 1000,
      totalIncome: 2000,
      createdAt: 1241412421,
      updatedAt: 1241412421,
      employeeProjects: [
        { employee: { id: 1, name: 'Employee 1', imageId: '3' } },
        { employee: { id: 2, name: 'Employee 2', imageId: '4' } },
      ],
      values: [
        { id: 1, totalExpense: 1000, totalRevenue: 2000, netProfit: 1000 },
        { id: 2, totalExpense: 1500, totalRevenue: 2500, netProfit: 1000 },
      ],
      _count: { contracts: 2 },
    };

    const project = await formatProject(getProject);

    const expectedProject = {
      id: 1,
      name: 'Project 1',
      companyId: 1,
      completedPercent: 30,
      stage: 'Stage 1',
      imageId: '1',
      totalExpense: 1000,
      totalIncome: 2000,
      createdAt: 1241412421,
      updatedAt: 1241412421,
      members: [
        { id: 1, name: 'Employee 1', imageId: '3' },
        { id: 2, name: 'Employee 2', imageId: '4' },
      ],
      income: 1500,
      expense: 2500,
      profit: 1000,
      contractAmount: 2,
    };
    // Add assertions to verify the formatted project
    expect(project).toEqual(expectedProject);
  });
});
