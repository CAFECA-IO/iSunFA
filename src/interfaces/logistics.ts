import type { Geometry } from "geojson";

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
  co2eKg?: number;
  geometry: Geometry | null;
  isFallback?: boolean;
}

export interface IComparePlansResponse {
  success: boolean;
  plans: {
    landOnly: ITransportSegment & { co2eKg?: number };
    sea_multimodal: {
      land_origin_to_port: ITransportSegment;
      sea_port_to_port: ITransportSegment;
      land_port_to_dest: ITransportSegment;
      total_co2eKg?: number;
    };
    air_multimodal: {
      land_origin_to_airport: ITransportSegment;
      air_airport_to_airport: ITransportSegment;
      land_airport_to_dest: ITransportSegment;
      total_co2eKg?: number;
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
