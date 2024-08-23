import * as module from '@/pages/api/v1/company/[companyId]/profit_insight/index';
import * as repository from '@/lib/utils/repo/profit_insight.repo';

jest.mock('../../../../../../lib/utils/repo/profit_insight.repo', () => {
  return {
    getIncomeExpenseToday: jest.fn(),
    getIncomeExpenseYesterday: jest.fn(),
    getProjectsIncomeExpense: jest.fn(),
    getPreLaunchProjectCount: jest.fn(),
  };
});

const companyId = 1;
beforeEach(() => {
  const mockIncomeExpenseToday = [
    {
      income: 1000,
      expense: 500,
    },
  ];

  const mockIncomeExpenseYesterday = [
    {
      income: 2000,
      expense: 1000,
    },
  ];

  const mockProjectsIncomeExpense = [
    {
      projectId: 1,
      _sum: {
        income: 3000,
        expense: 1500,
      },
    },
  ];

  const mockPreLaunchProjectCount = 1;
  jest.spyOn(repository, 'getIncomeExpenseToday').mockResolvedValue(mockIncomeExpenseToday);
  jest.spyOn(repository, 'getIncomeExpenseYesterday').mockResolvedValue(mockIncomeExpenseYesterday);
  jest.spyOn(repository, 'getProjectsIncomeExpense').mockResolvedValue(mockProjectsIncomeExpense);
  jest.spyOn(repository, 'getPreLaunchProjectCount').mockResolvedValue(mockPreLaunchProjectCount);
});

afterEach(() => {
  jest.clearAllMocks();
});
describe('getProfitChange', () => {
  it('should return profit change', async () => {
    const result = await module.getProfitChange(1623057600000, companyId);
    expect(result).toEqual({ profitChange: -0.5, emptyProfitChange: false });
  });
});

describe('getTopProjectRoi', () => {
  it('should return top project roi', async () => {
    const result = await module.getTopProjectRoi(companyId);
    expect(result).toEqual({ topProjectRoi: 0.5, emptyTopProjectRoi: false });
  });
});

describe('getPreLaunchProject', () => {
  it('should return pre launch project', async () => {
    const result = await module.getPreLaunchProject(companyId);
    expect(result).toEqual({ preLaunchProject: 1, emptyPreLaunchProject: false });
  });
});

describe('handleGetRequest', () => {
  it('should return profit insight', async () => {
    const result = await module.handleGetRequest(companyId);
    expect(result).toEqual({
      profitChange: -0.5,
      emptyProfitChange: false,
      topProjectRoi: 0.5,
      emptyTopProjectRoi: false,
      preLaunchProject: 1,
      emptyPreLaunchProject: false,
    });
  });
});
