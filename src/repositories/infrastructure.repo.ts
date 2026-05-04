import { prisma } from "@/lib/prisma";

export const infrastructureRepo = {
  upsertSeaport(data: {
    id: string;
    name: string;
    country: string;
    size: string;
    lat: number;
    lng: number;
  }) {
    return prisma.seaport.upsert({
      where: { id: data.id },
      update: {
        name: data.name,
        country: data.country,
        size: data.size,
        lat: data.lat,
        lng: data.lng,
      },
      create: {
        id: data.id,
        name: data.name,
        country: data.country,
        size: data.size,
        lat: data.lat,
        lng: data.lng,
      },
    });
  },

  upsertAirport(data: {
    id: string;
    iataCode: string;
    name: string;
    country: string;
    size: string;
    lat: number;
    lng: number;
  }) {
    return prisma.airport.upsert({
      where: { id: data.id },
      update: {
        iataCode: data.iataCode,
        name: data.name,
        country: data.country,
        size: data.size,
        lat: data.lat,
        lng: data.lng,
      },
      create: {
        id: data.id,
        iataCode: data.iataCode,
        name: data.name,
        country: data.country,
        size: data.size,
        lat: data.lat,
        lng: data.lng,
      },
    });
  },
};
