import prisma from '@/client';
import {
  ISalaryRecord,
  INewSalaryRecord,
  ISalaryRecordWithProjects,
  ISalaryRecordWithProjectsAndHours,
} from '@/interfaces/salary_record';
import { timestampInSeconds, calculateWorkingHours } from '@/lib/utils/common';
import { IFolder } from '@/interfaces/folder';
import { JOURNAL_EVENT } from '@/constants/journal';

function notEmpty<TValue>(value: TValue | null | undefined): value is TValue {
  return value !== null && value !== undefined;
}

export async function getSalaryInfoByEmployeeId(id: number): Promise<{
  id: number;
  salary: number;
  insurancePayment: number;
  bonus: number;
  name: string;
  department: string;
} | null> {
  const employeeInfo = await prisma.employee.findFirst({
    where: {
      id,
      OR: [{ deletedAt: 0 }, { deletedAt: null }],
    },
    select: {
      id: true,
      name: true,
      salary: true,
      insurancePayment: true,
      bonus: true,
      department: {
        select: {
          name: true,
        },
      },
    },
  });
  const formatEmployeeInfo = employeeInfo
    ? {
        id: employeeInfo.id,
        salary: employeeInfo.salary,
        insurancePayment: employeeInfo.insurancePayment,
        bonus: employeeInfo.bonus,
        name: employeeInfo.name,
        department: employeeInfo.department.name,
      }
    : null;
  return formatEmployeeInfo;
}

export async function updateSalaryRecordsConfirmed(
  accountBookId: number
): Promise<ISalaryRecord[]> {
  const now = Date.now();
  const nowTimestamp = timestampInSeconds(now);
  await prisma.salaryRecord.updateMany({
    where: {
      employee: {
        accountBookId,
      },
      confirmed: false,
    },
    data: {
      confirmed: true,
      updatedAt: nowTimestamp,
    },
  });
  const updatedSalaryRecords = await prisma.salaryRecord.findMany({
    where: {
      employee: {
        accountBookId,
      },
      confirmed: true,
      updatedAt: nowTimestamp,
    },
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
  });
  const formatUpdatedSalaryRecords = updatedSalaryRecords.map((record) => {
    return {
      id: record.id,
      employeeId: record.employeeId,
      employeeName: record.employee.name,
      employeeDepartment: record.employee.department.name,
      salary: record.salary,
      insurancePayment: record.insurancePayment,
      bonus: record.bonus,
      description: record.description,
      startDate: record.startDate,
      endDate: record.endDate,
      workingHour: record.workingHour,
      confirmed: record.confirmed,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  });
  return formatUpdatedSalaryRecords;
}

export async function createSalaryRecord(
  type: string,
  frequency: string,
  startDate: number,
  endDate: number,
  employeeIdList: number[],
  description: string
): Promise<ISalaryRecord[]> {
  const now = Date.now();
  const nowTimestamp = timestampInSeconds(now);
  const totalWorkingHours = calculateWorkingHours(startDate, endDate);
  const newSalaryRecords = await Promise.all(
    employeeIdList.map(async (employeeId) => {
      const formatEmployeeInfo = await getSalaryInfoByEmployeeId(employeeId);
      if (!formatEmployeeInfo) {
        return null;
      }
      if (type === 'Salary') {
        const salary: INewSalaryRecord = {
          employeeId,
          employeeName: formatEmployeeInfo.name,
          employeeDepartment: formatEmployeeInfo.department,
          salary: formatEmployeeInfo.salary,
          insurancePayment: formatEmployeeInfo.insurancePayment,
          bonus: 0,
          description,
          startDate,
          endDate,
          workingHour: totalWorkingHours,
          confirmed: false,
          createdAt: nowTimestamp,
          updatedAt: nowTimestamp,
        };
        return salary;
      } else if (type === 'Bonus') {
        const salary: INewSalaryRecord = {
          employeeId,
          employeeName: formatEmployeeInfo.name,
          employeeDepartment: formatEmployeeInfo.department,
          salary: 0,
          insurancePayment: 0,
          bonus: formatEmployeeInfo.bonus,
          description,
          startDate,
          endDate,
          workingHour: totalWorkingHours,
          confirmed: false,
          createdAt: nowTimestamp,
          updatedAt: nowTimestamp,
        };
        return salary;
      } else {
        return null;
      }
    })
  );
  const validateNewSalaryRecords = newSalaryRecords.filter(notEmpty<INewSalaryRecord>);
  if (validateNewSalaryRecords.length === 0) {
    return [];
  } else {
    const savedSalaryRecords = validateNewSalaryRecords.map((record) => {
      return {
        employeeId: record.employeeId,
        salary: record.salary,
        insurancePayment: record.insurancePayment,
        bonus: record.bonus,
        description: record.description,
        startDate: record.startDate,
        endDate: record.endDate,
        workingHour: record.workingHour,
        confirmed: record.confirmed,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      };
    });
    await prisma.salaryRecord.createMany({
      data: savedSalaryRecords,
    });
    const newSalaryRecordsWithId = await prisma.salaryRecord.findMany({
      where: {
        createdAt: nowTimestamp,
      },
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
    });
    const formatNewSalaryRecordsWithId = newSalaryRecordsWithId.map((record) => {
      return {
        id: record.id,
        employeeId: record.employeeId,
        employeeName: record.employee.name,
        employeeDepartment: record.employee.department.name,
        salary: record.salary,
        insurancePayment: record.insurancePayment,
        bonus: record.bonus,
        description: record.description,
        startDate: record.startDate,
        endDate: record.endDate,
        workingHour: record.workingHour,
        confirmed: record.confirmed,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      };
    });
    return formatNewSalaryRecordsWithId;
  }
}

export async function getSalaryRecordsList(accountBookId: number): Promise<ISalaryRecord[]> {
  const salaryRecordsLists = await prisma.salaryRecord.findMany({
    where: {
      employee: {
        accountBookId,
      },
      OR: [{ deletedAt: 0 }, { deletedAt: null }],
    },
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
  });
  const formatSalaryRecordsLists = salaryRecordsLists.map((record) => {
    return {
      id: record.id,
      employeeId: record.employeeId,
      employeeName: record.employee.name,
      employeeDepartment: record.employee.department.name,
      salary: record.salary,
      insurancePayment: record.insurancePayment,
      bonus: record.bonus,
      description: record.description,
      startDate: record.startDate,
      endDate: record.endDate,
      workingHour: record.workingHour,
      confirmed: record.confirmed,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  });
  return formatSalaryRecordsLists;
}

export async function getSalaryRecordById(
  salaryIdNum: number,
  accountBookId: number
): Promise<ISalaryRecordWithProjects | null> {
  const salaryRecord = await prisma.salaryRecord.findFirst({
    where: {
      id: salaryIdNum,
      employee: {
        accountBookId,
      },
      OR: [{ deletedAt: 0 }, { deletedAt: null }],
    },
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
  });
  const projects = await prisma.employeeProject.findMany({
    where: {
      employeeId: salaryRecord?.employeeId,
      startDate: {
        lte: salaryRecord?.createdAt,
      },
      endDate: null,
    },
    select: {
      project: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
  const formatProjects = projects.map((project) => {
    return {
      id: project.project.id,
      name: project.project.name,
    };
  });
  const formatSalaryRecord = salaryRecord
    ? {
        id: salaryRecord.id,
        employeeId: salaryRecord.employeeId,
        employeeName: salaryRecord.employee.name,
        employeeDepartment: salaryRecord.employee.department.name,
        salary: salaryRecord.salary,
        insurancePayment: salaryRecord.insurancePayment,
        bonus: salaryRecord.bonus,
        description: salaryRecord.description,
        startDate: salaryRecord.startDate,
        endDate: salaryRecord.endDate,
        workingHour: salaryRecord.workingHour,
        confirmed: salaryRecord.confirmed,
        createdAt: salaryRecord.createdAt,
        updatedAt: salaryRecord.updatedAt,
        projects: formatProjects,
      }
    : null;
  return formatSalaryRecord;
}

export async function updateSalaryRecordById(
  salaryIdNum: number,
  accountBookId: number,
  startDate: number,
  endDate: number,
  department: string,
  name: string,
  salary: number,
  bonus: number,
  insurancePayment: number,
  description: string,
  workingHours: number,
  projects: {
    id: number;
    name: string;
    hours: number;
  }[]
): Promise<ISalaryRecordWithProjectsAndHours | null> {
  const now = Date.now();
  const nowTimestamp = timestampInSeconds(now);
  const updatedSalaryRecord = await prisma.salaryRecord.update({
    where: {
      id: salaryIdNum,
      employee: {
        accountBookId,
      },
    },
    data: {
      salary,
      insurancePayment,
      bonus,
      description,
      startDate,
      endDate,
      workingHour: workingHours,
      updatedAt: nowTimestamp,
    },
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
  });
  const employeeProjectIds = await prisma.employeeProject.findMany({
    where: {
      employeeId: updatedSalaryRecord.employeeId,
      startDate: {
        lte: updatedSalaryRecord.createdAt,
      },
      endDate: null,
    },
    select: {
      id: true,
      project: {
        select: {
          id: true,
        },
      },
    },
  });
  employeeProjectIds.forEach(async (employeeProjectId) => {
    const projectInfo = projects.find((project) => project.id === employeeProjectId.project.id);
    if (projectInfo) {
      await prisma.workRate.create({
        data: {
          employeeProjectId: employeeProjectId.id,
          expectedHours: projectInfo.hours,
          actualHours: projectInfo.hours,
          createdAt: nowTimestamp,
          updatedAt: nowTimestamp,
        },
      });
    }
  });
  const formatUpdatedSalaryRecord = updatedSalaryRecord
    ? {
        id: updatedSalaryRecord.id,
        employeeId: updatedSalaryRecord.employeeId,
        employeeName: updatedSalaryRecord.employee.name,
        employeeDepartment: updatedSalaryRecord.employee.department.name,
        salary: updatedSalaryRecord.salary,
        insurancePayment: updatedSalaryRecord.insurancePayment,
        bonus: updatedSalaryRecord.bonus,
        description: updatedSalaryRecord.description,
        startDate: updatedSalaryRecord.startDate,
        endDate: updatedSalaryRecord.endDate,
        workingHour: updatedSalaryRecord.workingHour,
        confirmed: updatedSalaryRecord.confirmed,
        createdAt: updatedSalaryRecord.createdAt,
        updatedAt: updatedSalaryRecord.updatedAt,
        projects,
      }
    : null;
  return formatUpdatedSalaryRecord;
}

export async function createSalaryRecordJournal(
  accountBookId: number,
  event: JOURNAL_EVENT = JOURNAL_EVENT.UPLOADED
): Promise<number> {
  const now = Date.now();
  const nowTimestamp = timestampInSeconds(now);
  const journal = await prisma.journal.create({
    data: {
      event,
      createdAt: nowTimestamp,
      updatedAt: nowTimestamp,
      accountBookId,
    },
  });
  return journal.id;
}

export async function getInfoFromSalaryRecordLists(
  salaryRecordsLists: number[],
  voucherType: string
): Promise<{
  description: string;
  amount: number;
}> {
  const salaryRecords = await prisma.salaryRecord.findMany({
    where: {
      id: {
        in: salaryRecordsLists,
      },
    },
    select: {
      salary: true,
      insurancePayment: true,
      bonus: true,
      description: true,
    },
  });
  const { description } = salaryRecords[0];
  let amount = 0;
  if (voucherType === 'Salary') {
    const totalSalary = salaryRecords.reduce((acc, record) => acc + record.salary, 0);
    const totalInsurancePayment = salaryRecords.reduce(
      (acc, record) => acc + record.insurancePayment,
      0
    );
    amount = totalSalary + totalInsurancePayment;
  } else if (voucherType === 'Bonus') {
    amount = salaryRecords.reduce((acc, record) => acc + record.bonus, 0);
  }
  return {
    description,
    amount,
  };
}

export async function createVoucherFolder(
  voucherType: string,
  newVoucherNo: string,
  accountBookId: number
): Promise<IFolder> {
  const now = Date.now();
  const nowTimestamp = timestampInSeconds(now);
  const name = `${voucherType} Voucher: ${newVoucherNo}`;
  const voucherFolder = await prisma.voucherSalaryRecordFolder.create({
    data: {
      name,
      createdAt: nowTimestamp,
      updatedAt: nowTimestamp,
      accountBookId,
    },
  });
  return voucherFolder;
}

export async function createVoucherSalaryRecordFolderMapping(
  voucherFolderId: number,
  salaryRecordsIdsList: number[],
  voucherDataId: number
) {
  const now = Date.now();
  const nowTimestamp = timestampInSeconds(now);
  salaryRecordsIdsList.map(async (salaryRecordId) => {
    await prisma.voucherSalaryRecord.create({
      data: {
        voucherId: voucherDataId,
        salaryRecordId,
        voucherSalaryRecordFolderId: voucherFolderId,
        createdAt: nowTimestamp,
        updatedAt: nowTimestamp,
      },
    });
  });
}
