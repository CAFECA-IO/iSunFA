import { IEsgActivityType } from "@/constants/esg_activity_type";
import { EsgScope } from "@/interfaces/esg";
import { ICoefficient } from "@/interfaces/coefficient";

export interface IEmissionSources {
  id: string;
  name: string;
  activityType: IEsgActivityType;
  coefficient: ICoefficient | null;
}

export interface IActivityData {
  activityType: IEsgActivityType;
  emissionSources: IEmissionSources[];
}

export interface IEsgEmissionSourcesSummary {
  totalEmissionSourcesCount: number;
  estimatedAnnualTotalEmission: number;
  top3EmissionSources: {
    name: string;
    value: number;
  }[];
  scopeDistribution: {
    scope: EsgScope;
    count: number;
  }[];
}

export const mockSummaryData: IEsgEmissionSourcesSummary = {
  totalEmissionSourcesCount: 10,
  estimatedAnnualTotalEmission: 15420.8,
  top3EmissionSources: [
    {
      name: "台中廠區 - A 棟電表",
      value: 8420.5,
    },
    {
      name: "熱軋鋼捲採購 - 中鋼",
      value: 3250.2,
    },
    {
      name: "公司貨車 ABC-1234 今天想去哪裡",
      value: 1240.8,
    },
  ],
  scopeDistribution: [
    {
      scope: EsgScope.SCOPE_1,
      count: 5,
    },
    {
      scope: EsgScope.SCOPE_2,
      count: 3,
    },
    {
      scope: EsgScope.SCOPE_3,
      count: 2,
    },
  ],
};
