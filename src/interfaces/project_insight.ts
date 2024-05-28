export interface IProfitInsight {
  profitChange: number;
  topProjectRoi: number;
  preLaunchProject: number;
}

export const DUMMY_PROJECT_INSIGHT: IProfitInsight = {
  profitChange: -0.1,
  topProjectRoi: 0.3,
  preLaunchProject: 10,
};
