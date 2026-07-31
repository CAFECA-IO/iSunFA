// Info: (20260724 - Tzuhan) 運輸方式適用性引擎單元測試:國內短程、跨海、同港退化、後端旗標優先權

import { describe, it, expect } from "@jest/globals";
import { getRouteApplicability } from "@/lib/utils/route_applicability";
import {
  ILogisticsPlan,
  ITransportSegment,
  INearestPortResult,
} from "@/interfaces/logistics";

const mockPort: INearestPortResult = {
  id: "port-1",
  name: "Mock Port",
  country: "TW",
  lat: 25,
  lng: 121,
  distance_km: 10,
};

const realLandRoute = (distanceKm: number): ITransportSegment => ({
  success: true,
  distanceKm,
  // Info: (20260724 - Tzuhan) 3 點以上代表真實路網路徑(非直線 fallback)
  geometry: {
    type: "LineString",
    coordinates: [
      [121, 25],
      [120.5, 24],
      [120.3, 22.6],
    ],
  },
});

const fallbackLandRoute = (distanceKm: number): ITransportSegment => ({
  success: false,
  distanceKm,
  isFallback: true,
  geometry: {
    type: "LineString",
    coordinates: [
      [121, 25],
      [120.3, 22.6],
    ],
  },
});

const segment = (success: boolean, distanceKm: number): ITransportSegment => ({
  success,
  distanceKm,
  geometry: success
    ? {
        type: "LineString",
        coordinates: [
          [121, 25],
          [122, 26],
          [123, 27],
        ],
      }
    : null,
});

const buildPlan = (overrides: {
  landOnly: ITransportSegment;
  sea: {
    originToPort: ITransportSegment;
    portToPort: ITransportSegment;
    portToDest: ITransportSegment;
    isApplicable?: boolean;
  };
  air: {
    originToAirport: ITransportSegment;
    airportToAirport: ITransportSegment;
    airportToDest: ITransportSegment;
    isApplicable?: boolean;
  };
  custom?: boolean;
  // Info: (20260729 - Tzuhan) issue 10:海陸空聯運(串聯路徑)
  sla?: {
    seaKm: number;
    airKm: number;
    landKm?: number;
    isApplicable?: boolean;
  };
}): ILogisticsPlan => ({
  exportPort: mockPort,
  importPort: mockPort,
  exportAirport: mockPort,
  importAirport: mockPort,
  comparisonData: {
    success: true,
    plans: {
      landOnly: overrides.landOnly,
      sea_multimodal: {
        land_origin_to_port: overrides.sea.originToPort,
        sea_port_to_port: overrides.sea.portToPort,
        land_port_to_dest: overrides.sea.portToDest,
        total_co2eKg: "0",
        isApplicable: overrides.sea.isApplicable,
      },
      air_multimodal: {
        land_origin_to_airport: overrides.air.originToAirport,
        air_airport_to_airport: overrides.air.airportToAirport,
        land_airport_to_dest: overrides.air.airportToDest,
        total_co2eKg: "0",
        isApplicable: overrides.air.isApplicable,
      },
      sea_land_air_multimodal: overrides.sla
        ? {
            land_origin_to_port: segment(true, overrides.sla.landKm ?? 20),
            sea_port_to_port: segment(true, overrides.sla.seaKm),
            land_port_to_airport: segment(true, overrides.sla.landKm ?? 20),
            air_airport_to_airport: segment(true, overrides.sla.airKm),
            land_airport_to_dest: segment(true, overrides.sla.landKm ?? 20),
            total_co2eKg: "0",
            isApplicable: overrides.sla.isApplicable,
          }
        : undefined,
      custom_multimodal: overrides.custom
        ? { segments: [], total_co2eKg: "0", total_distanceKm: 0 }
        : undefined,
    },
  },
});

describe("getRouteApplicability", () => {
  it("國內短程(台北→高雄):陸運可直達且更短,海空運皆屏蔽", () => {
    const plan = buildPlan({
      landOnly: realLandRoute(350),
      sea: {
        originToPort: segment(true, 30),
        portToPort: segment(true, 320),
        portToDest: segment(true, 20),
      },
      air: {
        originToAirport: segment(true, 25),
        airportToAirport: segment(true, 300),
        airportToDest: segment(true, 35),
      },
    });

    const result = getRouteApplicability(plan);
    expect(result.land).toBe(true);
    expect(result.sea).toBe(false);
    expect(result.air).toBe(false);
  });

  it("跨海(台北→上海):陸運為直線 fallback,海空運皆適用", () => {
    const plan = buildPlan({
      landOnly: fallbackLandRoute(680),
      sea: {
        originToPort: segment(true, 30),
        portToPort: segment(true, 800),
        portToDest: segment(true, 40),
      },
      air: {
        originToAirport: segment(true, 25),
        airportToAirport: segment(true, 690),
        airportToDest: segment(true, 30),
      },
    });

    const result = getRouteApplicability(plan);
    expect(result.land).toBe(false);
    expect(result.sea).toBe(true);
    expect(result.air).toBe(true);
  });

  it("同港退化:港到港距離低於門檻,海運屏蔽", () => {
    const plan = buildPlan({
      landOnly: fallbackLandRoute(50),
      sea: {
        originToPort: segment(true, 20),
        portToPort: segment(true, 0),
        portToDest: segment(true, 25),
      },
      air: {
        originToAirport: segment(true, 15),
        airportToAirport: segment(true, 30),
        airportToDest: segment(true, 20),
      },
    });

    const result = getRouteApplicability(plan);
    expect(result.sea).toBe(false);
    // Info: (20260724 - Tzuhan) 機場間 30km 亦低於空運門檻
    expect(result.air).toBe(false);
  });

  it("陸運距離較長時不屏蔽聯運(跨國陸海皆可達)", () => {
    const plan = buildPlan({
      landOnly: realLandRoute(2000),
      sea: {
        originToPort: segment(true, 100),
        portToPort: segment(true, 1200),
        portToDest: segment(true, 150),
      },
      air: {
        originToAirport: segment(true, 50),
        airportToAirport: segment(true, 1500),
        airportToDest: segment(true, 60),
      },
    });

    const result = getRouteApplicability(plan);
    expect(result.land).toBe(true);
    expect(result.sea).toBe(true);
    expect(result.air).toBe(true);
  });

  it("後端 isApplicable 旗標優先於前端推導", () => {
    const plan = buildPlan({
      landOnly: fallbackLandRoute(680),
      sea: {
        originToPort: segment(true, 30),
        portToPort: segment(true, 800),
        portToDest: segment(true, 40),
        isApplicable: false,
      },
      air: {
        originToAirport: segment(true, 25),
        airportToAirport: segment(true, 690),
        airportToDest: segment(true, 30),
        isApplicable: false,
      },
    });

    const result = getRouteApplicability(plan);
    expect(result.sea).toBe(false);
    expect(result.air).toBe(false);
  });

  it("無 plan 或缺 comparisonData:全部不適用", () => {
    expect(getRouteApplicability(null)).toEqual({
      land: false,
      sea: false,
      air: false,
      seaLandAir: false,
      custom: false,
    });
    expect(getRouteApplicability(undefined)).toEqual({
      land: false,
      sea: false,
      air: false,
      seaLandAir: false,
      custom: false,
    });
  });

  it("custom 方案存在即適用", () => {
    const plan = buildPlan({
      landOnly: fallbackLandRoute(100),
      sea: {
        originToPort: segment(false, 0),
        portToPort: segment(false, 0),
        portToDest: segment(false, 0),
      },
      air: {
        originToAirport: segment(false, 0),
        airportToAirport: segment(false, 0),
        airportToDest: segment(false, 0),
      },
      custom: true,
    });

    expect(getRouteApplicability(plan).custom).toBe(true);
  });
});

// Info: (20260729 - Tzuhan) issue 10:海陸空聯運適用性規則
describe("getRouteApplicability - seaLandAir (issue 10)", () => {
  const baseCrossOcean = {
    landOnly: fallbackLandRoute(680),
    sea: {
      originToPort: segment(true, 30),
      portToPort: segment(true, 800),
      portToDest: segment(true, 40),
    },
    air: {
      originToAirport: segment(true, 25),
      airportToAirport: segment(true, 690),
      airportToDest: segment(true, 30),
    },
  };

  it("海運段與空運段皆達門檻:適用", () => {
    const plan = buildPlan({
      ...baseCrossOcean,
      sla: { seaKm: 800, airKm: 690 },
    });
    expect(getRouteApplicability(plan).seaLandAir).toBe(true);
  });

  it("空運段低於門檻(中轉機場即目的機場等退化):不適用", () => {
    const plan = buildPlan({
      ...baseCrossOcean,
      sla: { seaKm: 800, airKm: 30 },
    });
    expect(getRouteApplicability(plan).seaLandAir).toBe(false);
  });

  it("海運段低於門檻:不適用", () => {
    const plan = buildPlan({
      ...baseCrossOcean,
      sla: { seaKm: 5, airKm: 690 },
    });
    expect(getRouteApplicability(plan).seaLandAir).toBe(false);
  });

  it("存在真實陸路且不長於本方案:不適用(繞海繞空純浪費)", () => {
    const plan = buildPlan({
      landOnly: realLandRoute(350),
      sea: baseCrossOcean.sea,
      air: baseCrossOcean.air,
      sla: { seaKm: 320, airKm: 300, landKm: 20 },
    });
    expect(getRouteApplicability(plan).seaLandAir).toBe(false);
  });

  it("方案不存在(無中轉機場):不適用", () => {
    const plan = buildPlan(baseCrossOcean);
    expect(getRouteApplicability(plan).seaLandAir).toBe(false);
  });

  it("後端 isApplicable 旗標優先", () => {
    const plan = buildPlan({
      ...baseCrossOcean,
      sla: { seaKm: 800, airKm: 690, isApplicable: false },
    });
    expect(getRouteApplicability(plan).seaLandAir).toBe(false);
  });
});
