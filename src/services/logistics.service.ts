"use server";

import { INearestPortResult } from "@/interfaces/logistics";
import seaportsData from "@/lib/data/seaports.json";
import airportsData from "@/lib/data/airports.json";

// Info: (20260430 - Tzuhan) Haversine formula to calculate distance in km
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) {
  const R = 6371; // Info: (20260430 - Tzuhan) Radius of the earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return d;
}

export async function getNearestPort(
  lat: number,
  lng: number,
): Promise<INearestPortResult | null> {
  try {
    if (isNaN(lat) || isNaN(lng))
      throw new Error("Invalid coordinates provided.");

    const ports = seaportsData as unknown as INearestPortResult[];

    if (ports.length === 0) return null;

    let nearest = ports[0];
    let minDistance = calculateDistance(lat, lng, nearest.lat, nearest.lng);

    for (const port of ports) {
      const dist = calculateDistance(lat, lng, port.lat, port.lng);
      if (dist < minDistance) {
        minDistance = dist;
        nearest = port;
      }
    }

    return {
      ...nearest,
      distance_km: minDistance,
    };
  } catch (error) {
    console.error("[Action Error] getNearestPort:", error);
    throw new Error("無法尋找最近的港口，請稍後再試。");
  }
}

export async function getNearestAirport(
  lat: number,
  lng: number,
): Promise<INearestPortResult | null> {
  try {
    if (isNaN(lat) || isNaN(lng))
      throw new Error("Invalid coordinates provided.");

    const airports = airportsData as unknown as INearestPortResult[];

    if (airports.length === 0) return null;

    let nearest = airports[0];
    let minDistance = calculateDistance(lat, lng, nearest.lat, nearest.lng);

    for (const airport of airports) {
      const dist = calculateDistance(lat, lng, airport.lat, airport.lng);
      if (dist < minDistance) {
        minDistance = dist;
        nearest = airport;
      }
    }

    return {
      ...nearest,
      distance_km: minDistance,
    };
  } catch (error) {
    console.error("[Action Error] getNearestAirport:", error);
    throw new Error("無法尋找最近的機場，請稍後再試。");
  }
}
