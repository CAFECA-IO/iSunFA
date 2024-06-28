export interface IProfitInsight {
  profitChange: number;
  topProjectRoi: number;
  preLaunchProject: number;
  emptyProfitChange: boolean;
  emptyTopProjectRoi: boolean;
  emptyPreLaunchProject: boolean;
}

export const DUMMY_PROJECT_INSIGHT: IProfitInsight = {
  profitChange: -0.1,
  topProjectRoi: 0.3,
  preLaunchProject: 10,
  emptyProfitChange: false,
  emptyTopProjectRoi: false,
  emptyPreLaunchProject: false,
};
