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

export const EsgGenerationSource = {
  MANUAL_ENTRY: "MANUAL_ENTRY",
  SYSTEM_DETERMINISTIC: "SYSTEM_DETERMINISTIC",
  AI_SPECULATIVE_STAGE_3: "AI_SPECULATIVE_STAGE_3",
} as const;

export type EsgGenerationSource =
  (typeof EsgGenerationSource)[keyof typeof EsgGenerationSource];
