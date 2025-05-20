import prisma from '@/client';
import {
  AGENT_FILING_ROLE,
  DECLARANT_FILING_METHOD,
  FILING_FREQUENCY,
  FILING_METHOD,
  WORK_TAG,
} from '@/interfaces/account_book';
import { ITodoAccountBook } from '@/interfaces/todo';
import { getTimestampNow, timestampInMilliSeconds, timestampInSeconds } from '@/lib/utils/common';
import { parseAddress } from '@/lib/utils/address';
import { Prisma } from '@prisma/client';

// 處理枚舉類型轉換的輔助函數
function convertEnumValue<T>(value: unknown): T | null {
  if (value === null || value === undefined) return null;
  return value as unknown as T;
}

// Info: (20250408 - Tzuhan) 統一 Utility: 從 note 中解析 startTime / endTime
export function splitStartEndTimeInNote(note: string | null): {
  note: string;
  startTime: number;
  endTime: number;
} {
  try {
    const parsed = JSON.parse(note || '{}');
    return {
      note: parsed.note ?? '',
      startTime: parsed.startTime ?? 0,
      endTime: parsed.endTime ?? 0,
    };
  } catch {
    return {
      note: note || '',
      startTime: 0,
      endTime: 0,
    };
  }
}

export function convertToTodoAccountBook(
  todo: Prisma.TodoGetPayload<{
    include: {
      userTodoCompanies: {
        include: {
          company: {
            include: {
              imageFile: true;
              companySettings?: {
                where: {
                  OR: [{ deletedAt: 0 }, { deletedAt: null }];
                };
              };
            };
          };
        };
      };
    };
  }>
): ITodoAccountBook {
  const company = todo.userTodoCompanies?.[0]?.company ?? null;
  const { note } = splitStartEndTimeInNote(todo.note);

  return {
    ...todo,
    note,
    startTime: timestampInMilliSeconds(todo.startDate),
    endTime: timestampInMilliSeconds(todo.endDate),
    company: company
      ? {
          ...company,
          imageId: company.imageFile?.url ?? '',
          tag: company.tag as WORK_TAG,

          // 從 companySettings 獲取數據或使用默認值
          representativeName: company.companySettings?.[0]?.representativeName || '',
          taxSerialNumber: company.companySettings?.[0]?.taxSerialNumber || '',
          contactPerson: company.companySettings?.[0]?.contactPerson || '',
          phoneNumber: company.companySettings?.[0]?.phone || '',

          // 處理地址數據
          ...(company.companySettings?.[0]?.address
            ? parseAddress(company.companySettings[0].address)
            : {
                city: '',
                district: '',
                enteredAddress: '',
              }),

          // 處理選填欄位
          filingFrequency: convertEnumValue<FILING_FREQUENCY>(
            company.companySettings?.[0]?.filingFrequency
          ),
          filingMethod: convertEnumValue<FILING_METHOD>(company.companySettings?.[0]?.filingMethod),
          declarantFilingMethod: convertEnumValue<DECLARANT_FILING_METHOD>(
            company.companySettings?.[0]?.declarantFilingMethod
          ),
          declarantName: company.companySettings?.[0]?.declarantName || null,
          declarantPersonalId: company.companySettings?.[0]?.declarantPersonalId || null,
          declarantPhoneNumber: company.companySettings?.[0]?.declarantPhoneNumber || null,
          agentFilingRole: convertEnumValue<AGENT_FILING_ROLE>(
            company.companySettings?.[0]?.agentFilingRole
          ),
          licenseId: company.companySettings?.[0]?.licenseId || null,
        }
      : null,
  };
}

export async function getTodoById(id: number): Promise<ITodoAccountBook | null> {
  const todo = await prisma.todo.findUnique({
    where: { id, OR: [{ deletedAt: 0 }, { deletedAt: null }] },
    include: {
      userTodoCompanies: {
        include: {
          company: {
            include: {
              imageFile: true,
              companySettings: {
                where: {
                  OR: [{ deletedAt: 0 }, { deletedAt: null }],
                },
              },
            },
          },
        },
      },
    },
  });

  return todo ? convertToTodoAccountBook(todo) : null;
}

export async function createTodo(data: {
  accountBookId?: number;
  name: string;
  deadline: number;
  userId: number;
  startDate: number;
  endDate: number;
  note: string | null;
}) {
  const now = getTimestampNow();

  const noteWithUser = JSON.stringify({
    note: data.note,
    userId: data.userId,
  });

  const createdTodo = await prisma.todo.create({
    data: {
      name: data.name,
      deadline: data.deadline,
      startDate: timestampInSeconds(data.startDate),
      endDate: timestampInSeconds(data.endDate),
      note: noteWithUser,
      status: true,
      createdAt: now,
      updatedAt: now,
    },
  });

  if (data.accountBookId) {
    await prisma.userTodoCompany.create({
      data: {
        todoId: createdTodo.id,
        userId: data.userId,
        companyId: data.accountBookId,
        createdAt: now,
        updatedAt: now,
      },
    });
  }

  return getTodoById(createdTodo.id);
}

async function listTodo(userId: number) {
  const todos = await prisma.todo.findMany({
    where: {
      AND: [
        {
          OR: [
            { userTodoCompanies: { some: { userId } } },
            { note: { contains: `"userId":${userId}` } },
          ],
        },
        {
          OR: [{ deletedAt: 0 }, { deletedAt: null }],
        },
      ],
    },
    include: {
      userTodoCompanies: {
        include: {
          company: {
            include: {
              imageFile: true,
              companySettings: {
                where: {
                  OR: [{ deletedAt: 0 }, { deletedAt: null }],
                },
              },
            },
          },
        },
      },
    },
  });

  return todos;
}

export async function listTodoMapped(userId: number): Promise<ITodoAccountBook[]> {
  const rawTodos = await listTodo(userId);
  return rawTodos.map(convertToTodoAccountBook).sort((a, b) => a.endTime - b.endTime);
}

export async function updateTodo(data: {
  id: number;
  name: string;
  startDate: number;
  endDate: number;
  deadline: number;
  note: string | null;
  accountBookId?: number;
  userId: number;
}) {
  const now = getTimestampNow();

  await prisma.todo.update({
    where: { id: data.id, deletedAt: null },
    data: {
      name: data.name,
      note: data.note,
      startDate: timestampInSeconds(data.startDate),
      endDate: timestampInSeconds(data.endDate),
      deadline: data.deadline,
      updatedAt: now,
    },
  });

  if (data.accountBookId) {
    const existing = await prisma.userTodoCompany.findFirst({
      where: { todoId: data.id, userId: data.userId },
    });

    if (existing) {
      await prisma.userTodoCompany.update({
        where: { id: existing.id },
        data: { companyId: data.accountBookId, updatedAt: now },
      });
    } else {
      await prisma.userTodoCompany.create({
        data: {
          todoId: data.id,
          userId: data.userId,
          companyId: data.accountBookId,
          createdAt: now,
          updatedAt: now,
        },
      });
    }
  }

  return getTodoById(data.id);
}

export async function deleteTodo(id: number) {
  const now = getTimestampNow();

  const deletedTodo = await prisma.todo.update({
    where: { id, deletedAt: null },
    data: {
      status: false,
      updatedAt: now,
      deletedAt: now,
    },
    include: {
      userTodoCompanies: {
        include: {
          company: { include: { imageFile: true } },
        },
      },
    },
  });

  return convertToTodoAccountBook(deletedTodo);
}
