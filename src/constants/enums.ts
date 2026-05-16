// Info: (20260514 - Tzuhan) Centralized constants to replace Prisma Enums

export const MeasurementUnit = {
  KWH: "KWH",
  LITER: "LITER",
  KG: "KG",
  TONNE: "TONNE",
  GALLON: "GALLON",
  PIECE: "PIECE",
  TWD: "TWD",
} as const;

export type MeasurementUnit =
  (typeof MeasurementUnit)[keyof typeof MeasurementUnit];
