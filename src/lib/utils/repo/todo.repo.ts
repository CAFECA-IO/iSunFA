import prisma from '@/client';
import { WORK_TAG } from '@/interfaces/account_book';
import { ITodoAccountBook } from '@/interfaces/todo';
import { getTimestampNow, timestampInMilliSeconds, timestampInSeconds } from '@/lib/utils/common';
import { Prisma } from '@prisma/client';

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

// Info: (20250408 - Tzuhan) 資料轉換器：後端統一 mapping 成 ITodoAccountBook
export function convertToTodoAccountBook(
  todo: Prisma.TodoGetPayload<{
    include: {
      userTodoCompanies: {
        include: {
          company: {
            include: { imageFile: true };
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
        }
      : null, // ✅ 若無關聯公司，設為 null
  };
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
  const nowTimestamp = getTimestampNow();
  const { name, deadline, userId, startDate, endDate, note, accountBookId: companyId } = data;

  const newTodo = await prisma.todo.create({
    data: {
      name,
      deadline,
      startDate: timestampInSeconds(startDate),
      endDate: timestampInSeconds(endDate),
      note,
      status: true,
      createdAt: nowTimestamp,
      updatedAt: nowTimestamp,
      ...(companyId && {
        userTodoCompanies: {
          create: {
            userId,
            companyId,
            createdAt: nowTimestamp,
            updatedAt: nowTimestamp,
          },
        },
      }),
    },
    include: {
      userTodoCompanies: {
        include: {
          company: {
            include: { imageFile: true },
          },
        },
      },
    },
  });

  return convertToTodoAccountBook(newTodo);
}

// Info: (20250408 - Tzuhan) listTodo 改為僅供內部使用
async function listTodo(userId: number) {
  return prisma.todo.findMany({
    where: {
      userTodoCompanies: {
        some: { userId },
      },
      OR: [{ deletedAt: 0 }, { deletedAt: null }],
    },
    include: {
      userTodoCompanies: {
        include: {
          company: {
            include: { imageFile: true },
          },
        },
      },
    },
  });
}

export async function listTodoMapped(userId: number): Promise<ITodoAccountBook[]> {
  const rawTodos = await listTodo(userId);
  return rawTodos.map(convertToTodoAccountBook).sort((a, b) => a.endTime - b.endTime);
}

export async function getTodoById(id: number): Promise<ITodoAccountBook | null> {
  const todo = await prisma.todo.findUnique({
    where: {
      id,
      OR: [{ deletedAt: 0 }, { deletedAt: null }],
    },
    include: {
      userTodoCompanies: {
        include: {
          company: {
            include: { imageFile: true },
          },
        },
      },
    },
  });

  return todo ? convertToTodoAccountBook(todo) : null;
}
export async function updateTodo(data: {
  id: number;
  name: string;
  startDate: number;
  endDate: number;
  deadline: number;
  note: string | null;
  accountBookId: number;
}) {
  const nowInSecond = getTimestampNow();
  const { name, deadline, startDate, endDate, note, accountBookId: companyId } = data;

  const updatedTodo = await prisma.todo.update({
    where: {
      id: data.id,
      deletedAt: null,
    },
    data: {
      name,
      deadline,
      note,
      startDate: timestampInSeconds(startDate),
      endDate: timestampInSeconds(endDate),
      updatedAt: nowInSecond,
      userTodoCompanies: {
        updateMany: {
          where: { todoId: data.id },
          data: {
            companyId,
            updatedAt: nowInSecond,
          },
        },
      },
    },
    include: {
      userTodoCompanies: {
        include: {
          company: {
            include: { imageFile: true },
          },
        },
      },
    },
  });

  return convertToTodoAccountBook(updatedTodo);
}

export async function deleteTodo(id: number) {
  const nowInSecond = getTimestampNow();

  const deletedTodo = await prisma.todo.update({
    where: {
      id,
      deletedAt: null,
    },
    data: {
      status: false,
      updatedAt: nowInSecond,
      deletedAt: nowInSecond,
    },
    include: {
      userTodoCompanies: {
        include: {
          company: {
            include: { imageFile: true },
          },
        },
      },
    },
  });

  return convertToTodoAccountBook(deletedTodo);
}
