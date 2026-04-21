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