import { AllocationEngineService } from "@/services/allocation.engine.service";
import { prisma } from "@/lib/prisma";

// Mock prisma client for unit tests
jest.mock("@/lib/prisma", () => ({
  prisma: {
    esgRecord: {
      findUnique: jest.fn(),
    },
    esgAllocation: {
      deleteMany: jest.fn(),
      create: jest.fn(),
    },
    digitalProductPassportSku: {
      findUnique: jest.fn(),
    },
  },
}));

describe("AllocationEngineService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should throw error if total percentage exceeds 100%", async () => {
    (prisma.esgRecord.findUnique as jest.Mock).mockResolvedValue({
      id: "esg-1",
      amount: 100,
      emissions: 50,
    });

    await expect(
      AllocationEngineService.allocate("esg-1", [
        { skuId: "sku-1", percentage: 0.6 },
        { skuId: "sku-2", percentage: 0.5 },
      ]),
    ).rejects.toThrow("Total allocation percentage cannot exceed 100% (1.0)");
  });

  it("should successfully allocate emissions to multiple products", async () => {
    (prisma.esgRecord.findUnique as jest.Mock).mockResolvedValue({
      id: "esg-1",
      amount: 1000,
      emissions: 500,
      ghgBreakdown: { CO2: 400, CH4: 100 },
    });

    (prisma.digitalProductPassportSku.findUnique as jest.Mock).mockResolvedValue({
      id: "mock-sku",
    });

    await AllocationEngineService.allocate("esg-1", [
      { skuId: "sku-1", percentage: 0.3, basis: "Weight" },
      { skuId: "sku-2", percentage: 0.7, basis: "Machine Hours" },
    ]);

    expect(prisma.esgAllocation.deleteMany).toHaveBeenCalledWith({
      where: { esgRecordId: "esg-1" },
    });

    expect(prisma.esgAllocation.create).toHaveBeenCalledTimes(2);

    // sku-1 should get 300 amount, 150 emissions
    expect(prisma.esgAllocation.create).toHaveBeenNthCalledWith(1, {
      data: expect.objectContaining({
        skuId: "sku-1",
        allocatedAmount: expect.objectContaining({ d: [300] }),
        allocatedEmissions: expect.objectContaining({ d: [150] }),
        allocatedGhgBreakdown: { CO2: "120", CH4: "30" },
      }),
    });

    // sku-2 should get 700 amount, 350 emissions
    expect(prisma.esgAllocation.create).toHaveBeenNthCalledWith(2, {
      data: expect.objectContaining({
        skuId: "sku-2",
        allocatedAmount: expect.objectContaining({ d: [700] }),
        allocatedEmissions: expect.objectContaining({ d: [350] }),
        allocatedGhgBreakdown: { CO2: "280", CH4: "70" },
      }),
    });
  });
});
