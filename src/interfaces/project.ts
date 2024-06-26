export interface IProject {
  id: number;
  companyId: number;
  imageId: string;
  name: string;
  income: number;
  expense: number;
  profit: number;
  contractAmount: number;
  stage: string;
  completedPercent: number;
  members: IMember[];
  createdAt: number;
  updatedAt: number;
}

export interface IMilestone {
  id: number;
  projectId: number;
  startDate: number;
  endDate: number;
  status: string;
  createdAt: number;
  updatedAt: number;
}

export interface IValue {
  id: number;
  projectId: number;
  totalRevenue: number;
  totalRevenueGrowthIn30d: number;
  totalExpense: number;
  netProfit: number;
  netProfitGrowthIn30d: number;
  netProfitGrowthInYear: number;
  createdAt: number;
  updatedAt: number;
}

export interface ISale {
  id: number;
  projectId: number;
  date: string;
  totalSales: number;
  comparison: number;
  createdAt: number;
  updatedAt: number;
}

export interface IWorkRate {
  id: number;
  employeeProjectId: number;
  member: IMember;
  involvementRate: number;
  expectedHours: number;
  actualHours: number;
  createdAt: number;
  updatedAt: number;
}

interface IMember {
  name: string;
  imageId: string;
}

export const dummyProjects: IProject[] = [
  {
    id: 1,
    companyId: 1,
    imageId: '/entities/happy.png',
    name: 'Project 1',
    stage: 'Beta Testing',
    completedPercent: 50,
    income: 1000,
    expense: 500,
    profit: 500,
    contractAmount: 3,
    members: [
      {
        name: 'Sunny',
        imageId: '/entities/tesla.png',
      },
      {
        name: 'David',
        imageId: '/entities/tidebit.jpeg',
      },
      {
        name: 'Wendy',
        imageId: '/entities/happy.png',
      },
    ],
    createdAt: 1624600000000,
    updatedAt: 1624600000000,
  },
  {
    id: 2,
    companyId: 2,
    name: 'Project 2',
    imageId: '/entities/happy.png',
    stage: 'Developing',
    completedPercent: 33,
    income: 4200,
    expense: 4700,
    profit: -500,
    contractAmount: 5,
    members: [
      {
        name: 'Alice',
        imageId: '/elements/avatar.png',
      },
      {
        name: 'Bob',
        imageId: '/entities/isuncloud.png',
      },
      {
        name: 'Cathy',
        imageId: '/entities/happy.png',
      },
      {
        name: 'Eva',
        imageId: '/elements/avatar.png',
      },
      {
        name: 'Xavier',
        imageId: '/entities/tesla.png',
      },
      {
        name: 'Hillary',
        imageId: '/entities/tidebit.jpeg',
      },
      {
        name: 'Colin',
        imageId: '/entities/happy.png',
      },
      {
        name: 'Hank',
        imageId: '/entities/isuncloud.png',
      },
      {
        name: 'Simon',
        imageId: '/entities/happy.png',
      },
      {
        name: 'Elaine',
        imageId: '/elements/avatar.png',
      },
      {
        name: 'Austin',
        imageId: '/entities/happy.png',
      },
    ],
    createdAt: 1624600000000,
    updatedAt: 1624600000000,
  },
  {
    id: 3,
    companyId: 3,
    name: 'Project 3',
    imageId: '/entities/happy.png',
    stage: 'Selling',
    completedPercent: 75,
    income: 2310,
    expense: 2354,
    profit: -44,
    contractAmount: 26,
    members: [
      {
        name: 'Zack',
        imageId: '/entities/happy.png',
      },
    ],
    createdAt: 1624600000000,
    updatedAt: 1624600000000,
  },
  {
    id: 4,
    companyId: 4,
    imageId: '/entities/happy.png',
    name: 'StellarScape',
    stage: 'Sold',
    completedPercent: 90,
    income: 13940,
    expense: 12480,
    profit: 1460,
    contractAmount: 8,
    members: [
      {
        name: 'Fiona',
        imageId: '/elements/avatar.png',
      },
      {
        name: 'George',
        imageId: '/entities/happy.png',
      },
    ],
    createdAt: 1624600000000,
    updatedAt: 1624600000000,
  },
  {
    id: 5,
    companyId: 5,
    imageId: '/entities/happy.png',
    name: 'Project 5',
    stage: 'Archived',
    completedPercent: 100,
    income: 23425,
    expense: 12412,
    profit: 11013,
    contractAmount: 20,
    members: [
      {
        name: 'Olivia',
        imageId: '/entities/tidebit.jpeg',
      },
      {
        name: 'Daisy',
        imageId: '/entities/tesla.png',
      },
      {
        name: 'Rita',
        imageId: '/elements/avatar.png',
      },
      {
        name: 'Silvia',
        imageId: '/entities/happy.png',
      },
    ],
    createdAt: 1624600000000,
    updatedAt: 1624600000000,
  },
];
