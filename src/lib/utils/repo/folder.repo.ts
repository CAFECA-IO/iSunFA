import prisma from '@/client';
import { IFolder, IFolderContent } from '@/interfaces/folder';
import { timestampInSeconds } from '@/lib/utils/common';
import { assertIsJournalEvent } from '@/lib/utils/type_guard/journal';

export async function getFolderList(accountBookId: number): Promise<IFolder[]> {
  const folderList = await prisma.voucherSalaryRecordFolder.findMany({
    where: {
      accountBookId,
      OR: [{ deletedAt: 0 }, { deletedAt: null }],
    },
  });
  const formattedFolderList = folderList.map((folder) => {
    return {
      id: folder.id,
      name: folder.name,
      createdAt: folder.createdAt,
    };
  });
  return formattedFolderList;
}

export async function updateFolderName(
  accountBookId: number,
  folderId: number,
  name: string
): Promise<IFolder | null> {
  const now = Date.now();
  const nowTimestamp = timestampInSeconds(now);
  const updatedFolder = await prisma.voucherSalaryRecordFolder.update({
    where: {
      id: folderId,
      accountBookId,
    },
    data: {
      name,
      updatedAt: nowTimestamp,
    },
  });
  if (!updatedFolder) {
    return null;
  }
  return {
    id: updatedFolder.id,
    name: updatedFolder.name,
    createdAt: updatedFolder.createdAt,
  };
}

export async function getFolderContent(
  accountBookId: number,
  folderId: number
): Promise<IFolderContent | null> {
  const salaryRecordList = await prisma.voucherSalaryRecord.findMany({
    where: {
      voucherSalaryRecordFolderId: folderId,
      voucherSalaryRecordFolder: {
        accountBookId,
      },
    },
    select: {
      voucherSalaryRecordFolder: {
        select: {
          id: true,
          name: true,
          createdAt: true,
        },
      },
      salaryRecord: {
        select: {
          id: true,
          employeeId: true,
          employee: {
            select: {
              name: true,
              department: {
                select: {
                  name: true,
                },
              },
              accountBook: {
                select: {
                  name: true,
                },
              },
            },
          },
          salary: true,
          insurancePayment: true,
          bonus: true,
          description: true,
          startDate: true,
          endDate: true,
          workingHour: true,
          confirmed: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });
  const voucher = await prisma.voucherSalaryRecord.findFirst({
    where: {
      voucherSalaryRecordFolderId: folderId,
    },
    select: {
      voucherId: true,
      voucher: {
        select: {
          no: true,
          createdAt: true,
          type: true,
        },
      },
    },
  });
  if (!voucher) {
    return null;
  }
  const voucherIdNumber = Number(voucher.voucherId);

  const lineItems = await prisma.lineItem.findMany({
    where: {
      voucherId: voucherIdNumber,
    },
    select: {
      debit: true,
      amount: true,
      account: {
        select: {
          code: true,
          name: true,
        },
      },
    },
  });
  const accounts = lineItems.map((lineItem) => {
    return {
      id: Number(lineItem.account.code),
      debit: lineItem.debit,
      account: lineItem.account.name,
      amount: lineItem.amount,
    };
  });

  assertIsJournalEvent(voucher.voucher.type);
  const folderContent = {
    id: folderId,
    name: salaryRecordList[0].voucherSalaryRecordFolder.name,
    createdAt: salaryRecordList[0].voucherSalaryRecordFolder.createdAt,
    voucher: {
      id: voucherIdNumber,
      event: voucher.voucher.type,
      date: voucher.voucher.createdAt,
      type: 'Payment',
      particulars: 'Salary Bookkeeping',
      fromTo: 'Employees',
      account: accounts,
      projectName: undefined,
      projectImageId: undefined,
      voucherId: voucherIdNumber,
      voucherNo: voucher.voucher.no,
    },
    salaryRecordList: salaryRecordList.map((record) => {
      return {
        id: record.salaryRecord.id,
        employeeId: record.salaryRecord.employeeId,
        employeeName: record.salaryRecord.employee.name,
        employeeDepartment: record.salaryRecord.employee.department.name,
        salary: record.salaryRecord.salary,
        insurancePayment: record.salaryRecord.insurancePayment,
        bonus: record.salaryRecord.bonus,
        description: record.salaryRecord.description,
        startDate: record.salaryRecord.startDate,
        endDate: record.salaryRecord.endDate,
        workingHour: record.salaryRecord.workingHour,
        confirmed: record.salaryRecord.confirmed,
        createdAt: record.salaryRecord.createdAt,
        updatedAt: record.salaryRecord.updatedAt,
      };
    }),
  };
  return folderContent;
}
