import type { Geometry } from "geojson";

export interface IWaypoint {
  id: string;
  name: string;
  lat?: number;
  lng?: number;
}

export interface INearestPortResult {
  id: string;
  name: string;
  country: string;
  lat: number;
  lng: number;
  distance_km: number;
}

export interface ITransportSegment {
  success: boolean;
  distanceKm?: number;
  co2eKg?: string;
  geometry: Geometry | null;
  isFallback?: boolean;
}

export interface IComparePlansResponse {
  success: boolean;
  plans: {
    landOnly: ITransportSegment & { co2eKg?: string };
    sea_multimodal: {
      land_origin_to_port: ITransportSegment;
      sea_port_to_port: ITransportSegment;
      land_port_to_dest: ITransportSegment;
      total_co2eKg?: string;
      // Info: (20260724 - Tzuhan) 由決定論適用性引擎判定(route_applicability.ts);歷史資料可能缺漏,前端以同函數 fallback 推導
      isApplicable?: boolean;
    };
    air_multimodal: {
      land_origin_to_airport: ITransportSegment;
      air_airport_to_airport: ITransportSegment;
      land_airport_to_dest: ITransportSegment;
      total_co2eKg?: string;
      // Info: (20260724 - Tzuhan) 同 sea_multimodal.isApplicable
      isApplicable?: boolean;
    };
    custom_multimodal?: {
      segments: (ITransportSegment & { mode: "LAND" | "SEA"; name?: string })[];
      total_co2eKg?: string;
      total_distanceKm?: number;
    };
  };
}

export interface ILogisticsPlan {
  exportPort: INearestPortResult;
  importPort: INearestPortResult;
  exportAirport: INearestPortResult;
  importAirport: INearestPortResult;
  comparisonData: IComparePlansResponse;
}
