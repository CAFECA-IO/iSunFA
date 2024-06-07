import prisma from '@/client';
import * as module from '@/pages/api/v1/company/[companyId]/invoice/invoice.repository';
import { Company, Invoice, Journal, Payment } from '@prisma/client';
import * as common from '@/lib/utils/common';
import { IPayment } from '@/interfaces/payment';
import { EventType, PaymentPeriodType, PaymentStatusType } from '@/constants/account';
import { IInvoice } from '@/interfaces/invoice';

jest.mock('../../../../../../lib/utils/common', () => ({
  formatApiResponse: jest.fn(),
  transformOCRImageIDToURL: jest.fn(),
  timestampInSeconds: jest.fn(),
}));

describe('/ocr/index.repository', () => {
  const nowTimestamp = 0;
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(common, "timestampInSeconds").mockReturnValue(nowTimestamp);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("findUniqueCompanyInPrisma", () => {
    it("should return company with id", () => {
      const companyId = 1;

      const mockPrismaReturn = {
        id: companyId
      } as Company;

      jest.spyOn(prisma.company, "findUnique").mockResolvedValue(mockPrismaReturn);

      const result = module.findUniqueCompanyInPrisma(companyId);
      expect(result).resolves.toEqual(mockPrismaReturn);
    });

    it("should throw error if company not found", () => {
      const companyId = 1;

      jest.spyOn(prisma.company, "findUnique").mockResolvedValue(null);

      const result = module.findUniqueCompanyInPrisma(companyId);
      expect(result).rejects.toThrow();
    });

    it("should throw error if prisma throws error", () => {
      const companyId = 1;

      jest.spyOn(prisma.company, "findUnique").mockRejectedValue(new Error());

      const result = module.findUniqueCompanyInPrisma(companyId);
      expect(result).rejects.toThrow();
    });
  });

  describe("create invoice related steps", () => {
    const invoiceId = 1;
    const paymentId = 2;
    const mockPaymentInput: IPayment = {
      isRevenue: true,
      price: 1000,
      hasTax: true,
      taxPercentage: 0,
      hasFee: true,
      fee: 0,
      method: "creditCard",
      period: PaymentPeriodType.AT_ONCE,
      installmentPeriod: 1,
      alreadyPaid: 100,
      status: PaymentStatusType.PAID,
      progress: 0
    };
    const mockInvoiceData:IInvoice = {
      journalId: null,
      date: 1234567890000,
      eventType: EventType.INCOME,
      paymentReason: "testReason",
      description: "testDescription",
      vendorOrSupplier: "testVendor",
      projectId: null,
      project: null,
      contractId: null,
      contract: null,
      payment: mockPaymentInput
    };
    describe("createPaymentInPrisma", () => {
      it("should create payment in prisma, and return id", async () => {
        const mockPrismaReturn = {
          id: paymentId
        } as Payment;

        jest.spyOn(prisma.payment, "create").mockResolvedValue(mockPrismaReturn);

        const result = await module.createPaymentInPrisma(mockPaymentInput);
        expect(result.id).toEqual(paymentId);
      });

      it("should throw error if prisma throws error", () => {
        jest.spyOn(prisma.payment, "create").mockRejectedValue(new Error());

        const result = module.createPaymentInPrisma(mockPaymentInput);
        expect(result).rejects.toThrow();
      });
    });

    describe("createInvoiceInPrisma", () => {
      it("should create invoice in prisma, and return id", async () => {
        const mockInvoiceCreateResult = {
          id: invoiceId
        } as Invoice;

        jest.spyOn(prisma.invoice, "create").mockResolvedValue(mockInvoiceCreateResult);

        const result = await module.createInvoiceInPrisma(mockInvoiceData, paymentId);
        expect(result).toEqual(mockInvoiceCreateResult);
        expect(result.id).toEqual(invoiceId);
      });

      it("should throw error if prisma throws error", () => {
        jest.spyOn(prisma.invoice, "create").mockRejectedValue(new Error());
        expect(module.createInvoiceInPrisma(mockInvoiceData, paymentId)).rejects.toThrow();
      });
    });

    describe("createInvoiceAndPaymentInPrisma", () => {
      it("should create invoice and payment in prisma, and return invoice id that is created", async () => {
        prisma.$transaction = jest.fn().mockImplementation((cb) => cb(prisma));

        const mockPaymentPrismaReturn = {
          id: paymentId
        } as Payment;

        const mockInvoicePrismaReturn = {
          id: invoiceId
        } as Invoice;

        jest.spyOn(prisma.payment, "create").mockResolvedValue(mockPaymentPrismaReturn);
        jest.spyOn(prisma.invoice, "create").mockResolvedValue(mockInvoicePrismaReturn);

        const resultInvoiceId = await module.createInvoiceAndPaymentInPrisma(mockInvoiceData);
        expect(prisma.$transaction).toHaveBeenCalledTimes(1);
        expect(resultInvoiceId).toEqual(invoiceId);
      });

      it("should throw error if prisma in transaction throws error", () => {
        const mockInvoicePrismaReturn = {
          id: invoiceId
        } as Invoice;

        jest.spyOn(prisma.payment, "create").mockRejectedValue(new Error());
        jest.spyOn(prisma.invoice, "create").mockResolvedValue(mockInvoicePrismaReturn);
        prisma.$transaction = jest.fn().mockImplementation((cb) => cb(prisma));

        expect(module.createInvoiceAndPaymentInPrisma(mockInvoiceData)).rejects.toThrow();
      });
    });
  });

  // ToDo: (20240605 - Murky) update invoice related steps need to change to PUT?
  describe("update invoice related steps", () => {
    const invoiceId = 1;
    const paymentId = 2;

    const mockPaymentInput: IPayment = {
      isRevenue: true,
      price: 1000,
      hasTax: true,
      taxPercentage: 0,
      hasFee: true,
      fee: 0,
      method: "creditCard",
      period: PaymentPeriodType.AT_ONCE,
      installmentPeriod: 1,
      alreadyPaid: 100,
      status: PaymentStatusType.PAID,
      progress: 0
    };
    const mockInvoiceData:IInvoice = {
      journalId: null,
      date: 1234567890000,
      eventType: EventType.INCOME,
      paymentReason: "testReason",
      description: "testDescription",
      vendorOrSupplier: "testVendor",
      projectId: null,
      project: null,
      contractId: null,
      contract: null,
      payment: mockPaymentInput
    };
    describe("findUniqueInvoiceInPrisma", () => {
      it("should return invoice with id", async () => {
        const mockFindInvoicePrismaReturn = {
          id: invoiceId,
          paymentId
        } as Invoice;

        jest.spyOn(prisma.invoice, "findUnique").mockResolvedValue(mockFindInvoicePrismaReturn);

        const result = await module.findUniqueInvoiceInPrisma(invoiceId);
        expect(result).toEqual(mockFindInvoicePrismaReturn);
        expect(result.id).toEqual(invoiceId);
        expect(result.paymentId).toEqual(paymentId);
      });

      it("should throw error if invoice not found", () => {
        jest.spyOn(prisma.invoice, "findUnique").mockResolvedValue(null);

        expect(module.findUniqueInvoiceInPrisma(invoiceId)).rejects.toThrow();
      });

      it("should throw error if prisma throws error", () => {
        jest.spyOn(prisma.invoice, "findUnique").mockRejectedValue(new Error());

        expect(module.findUniqueInvoiceInPrisma(invoiceId)).rejects.toThrow();
      });
    });

    describe("updatePaymentInPrisma", () => {
      it("should update payment in prisma, and return id", async () => {
        const mockPaymentUpdateResult = {
          id: paymentId
        } as Payment;

        jest.spyOn(prisma.payment, "update").mockResolvedValue(mockPaymentUpdateResult);

        const result = await module.updatePaymentInPrisma(paymentId, mockPaymentInput);
        expect(result.id).toEqual(paymentId);
      });

      it("should throw error if prisma throws error", () => {
        jest.spyOn(prisma.payment, "update").mockRejectedValue(new Error());

        expect(module.updatePaymentInPrisma(paymentId, mockPaymentInput)).rejects.toThrow();
      });
    });

    describe("updateInvoiceInPrisma", () => {
      it("should update invoice in prisma, and return id", async () => {
        const mockInvoiceUpdateResult = {
          id: invoiceId
        } as Invoice;

        jest.spyOn(prisma.invoice, "update").mockResolvedValue(mockInvoiceUpdateResult);

        const result = await module.updateInvoiceInPrisma(invoiceId, paymentId, mockInvoiceData);
        expect(result.id).toEqual(invoiceId);
      });

      it("should throw error if prisma throws error", () => {
        jest.spyOn(prisma.invoice, "update").mockRejectedValue(new Error());

        expect(module.updateInvoiceInPrisma(invoiceId, paymentId, mockInvoiceData)).rejects.toThrow();
      });
    });

    describe("updateInvoiceAndPaymentInPrisma", () => {
      it("should update invoice and payment in prisma, and return invoice id that is updated", async () => {
        prisma.$transaction = jest.fn().mockImplementation((cb) => cb(prisma));

        const mockFindInvoicePrismaReturn = {
          id: invoiceId,
          paymentId
        } as Invoice;
        const mockUpdatePaymentPrismaReturn = {
          id: paymentId
        } as Payment;

        const mockUpdateInvoicePrismaReturn = {
          id: invoiceId
        } as Invoice;

        jest.spyOn(prisma.invoice, "findUnique").mockResolvedValue(mockFindInvoicePrismaReturn);
        jest.spyOn(prisma.payment, "update").mockResolvedValue(mockUpdatePaymentPrismaReturn);
        jest.spyOn(prisma.invoice, "update").mockResolvedValue(mockUpdateInvoicePrismaReturn);

        const resultInvoiceId = await module.updateInvoiceAndPaymentInPrisma(invoiceId, mockInvoiceData);
        expect(prisma.$transaction).toHaveBeenCalledTimes(1);
        expect(resultInvoiceId).toEqual(invoiceId);
      });

      it("should throw error if prisma in transaction throws error", () => {
        const mockInvoicePrismaReturn = {
          id: invoiceId
        } as Invoice;

        jest.spyOn(prisma.payment, "update").mockRejectedValue(new Error());
        jest.spyOn(prisma.invoice, "update").mockResolvedValue(mockInvoicePrismaReturn);
        prisma.$transaction = jest.fn().mockImplementation((cb) => cb(prisma));

        expect(module.updateInvoiceAndPaymentInPrisma(invoiceId, mockInvoiceData)).rejects.toThrow();
      });
    });
  });
  describe("journal related steps", () => {
    const journalId = 1;
    const invoiceId = 2;
    const companyId = 3;
    const projectId = null;
    const contractId = null;
    const aichResultId = "testAichId";
    describe("findUniqueJournalInPrisma", () => {
      it("should return journal with id, and will return invoiceId", async () => {
        const mockFindJournalPrismaReturn = {
          id: journalId,
          invoiceId,
          ocrId: null,
          projectId: null
        } as Journal;

        jest.spyOn(prisma.journal, "findUnique").mockResolvedValue(mockFindJournalPrismaReturn);

        const result = await module.findUniqueJournalInPrisma(journalId);
        expect(result).toEqual(mockFindJournalPrismaReturn);
        expect(result.id).toEqual(journalId);
        expect(result.invoiceId).toEqual(invoiceId);
      });

      it("should throw error if journal not found", () => {
        jest.spyOn(prisma.journal, "findUnique").mockResolvedValue(null);

        expect(module.findUniqueJournalInPrisma(journalId)).rejects.toThrow();
      });
    });

    describe("createJournalInPrisma", () => {
      it("should create journal in prisma, and return id", async () => {
        const mockCreateJournalPrismaReturn = {
          id: journalId
        } as Journal;

        jest.spyOn(prisma.journal, "create").mockResolvedValue(mockCreateJournalPrismaReturn);

        const result = await module.createJournalInPrisma(
          invoiceId,
          projectId,
          aichResultId,
          contractId,
          companyId,
        );
        expect(result).toEqual(journalId);
      });

      it("should throw error if prisma throws error", () => {
        jest.spyOn(prisma.journal, "create").mockRejectedValue(new Error());

        expect(module.createJournalInPrisma(
          invoiceId,
          projectId,
          aichResultId,
          contractId,
          companyId
        )).rejects.toThrow();
      });
    });

    describe("updateJournalInPrisma", () => {
      it("should update journal in prisma, and return id", async () => {
        const mockUpdateJournalPrismaReturn = {
          id: journalId
        } as Journal;

        jest.spyOn(prisma.journal, "update").mockResolvedValue(mockUpdateJournalPrismaReturn);

        const result = await module.updateJournalInPrisma(
          journalId,
          invoiceId,
          aichResultId,
          projectId,
          contractId
        );
        expect(result).toEqual(journalId);
      });

      it("should throw error if prisma throws error", () => {
        jest.spyOn(prisma.journal, "update").mockRejectedValue(new Error());

        expect(module.updateJournalInPrisma(
          journalId,
          invoiceId,
          aichResultId,
          projectId,
          contractId
        )).rejects.toThrow();
      });
    });
  });

  describe("handlePrismaSavingLogic", () => {
    const journalId = 1;
    const invoiceId = 2;
    const companyId = 3;
    const paymentId = 4;
    const aichResultId = "testAichId";
    const mockPaymentInput: IPayment = {
      isRevenue: true,
      price: 1000,
      hasTax: true,
      taxPercentage: 0,
      hasFee: true,
      fee: 0,
      method: "creditCard",
      period: PaymentPeriodType.AT_ONCE,
      installmentPeriod: 1,
      alreadyPaid: 100,
      status: PaymentStatusType.PAID,
      progress: 0
    };
    const mockInvoiceData:IInvoice = {
      journalId: null,
      date: 1234567890000,
      eventType: EventType.INCOME,
      paymentReason: "testReason",
      description: "testDescription",
      vendorOrSupplier: "testVendor",
      projectId: null,
      project: null,
      contractId: null,
      contract: null,
      payment: mockPaymentInput
    };

    beforeEach(() => {
      const mockFindCompanyPrismaReturn = {
        id: companyId
      } as Company;
      jest.spyOn(prisma.company, "findUnique").mockResolvedValue(mockFindCompanyPrismaReturn);

      const mockPaymentCreatePrismaReturn = {
        id: paymentId
      } as Payment;

      jest.spyOn(prisma.payment, "create").mockResolvedValue(mockPaymentCreatePrismaReturn);

      const mockInvoiceCreateResult = {
        id: invoiceId
      } as Invoice;

      jest.spyOn(prisma.invoice, "create").mockResolvedValue(mockInvoiceCreateResult);

      const mockFindInvoicePrismaReturn = {
        id: invoiceId,
        paymentId
      } as Invoice;

      jest.spyOn(prisma.invoice, "findUnique").mockResolvedValue(mockFindInvoicePrismaReturn);

      const mockUpdatePaymentPrismaReturn = {
        id: paymentId
      } as Payment;

      jest.spyOn(prisma.payment, "update").mockResolvedValue(mockUpdatePaymentPrismaReturn);

      const mockUpdateInvoicePrismaReturn = {
        id: invoiceId
      } as Invoice;

      jest.spyOn(prisma.invoice, "update").mockResolvedValue(mockUpdateInvoicePrismaReturn);

      const mockCreateJournalPrismaReturn = {
        id: journalId
      } as Journal;

      jest.spyOn(prisma.journal, "create").mockResolvedValue(mockCreateJournalPrismaReturn);

      const mockUpdateJournalPrismaReturn = {
        id: journalId
      } as Journal;

      jest.spyOn(prisma.journal, "update").mockResolvedValue(mockUpdateJournalPrismaReturn);
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it("should create invoice and payment in prisma, and return journal id that is created", async () => {
      const mockFindJournalPrismaReturn = {
        id: journalId,
        invoiceId,
        ocrId: null,
        projectId: null
      } as Journal;

      jest.spyOn(prisma.journal, "findUnique").mockResolvedValue(mockFindJournalPrismaReturn);
      const resultInvoiceId = await module.handlePrismaSavingLogic(mockInvoiceData, aichResultId, companyId);
      expect(resultInvoiceId).toEqual(journalId);
    });

    it("should update invoice and payment in prisma, and return journal id that is updated", async () => {
      const mockFindJournalPrismaReturn = {
        id: journalId,
        invoiceId,
        ocrId: null,
        projectId: null
      } as Journal;

      jest.spyOn(prisma.journal, "findUnique").mockResolvedValue(mockFindJournalPrismaReturn);
      const resultInvoiceId = await module.handlePrismaSavingLogic(mockInvoiceData, aichResultId, companyId);
      expect(resultInvoiceId).toEqual(journalId);
    });
  });
});
