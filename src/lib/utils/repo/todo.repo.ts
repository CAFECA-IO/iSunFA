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

export function convertToTodoAccountBook(
  todo: Prisma.TodoGetPayload<{
    include: {
      userTodoAccountBooks: {
        include: {
          accountBook: {
            include: { imageFile: true };
          };
        };
      };
    };
  }>
): ITodoAccountBook {
  const company = todo.userTodoAccountBooks?.[0]?.accountBook ?? null;
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
      : null,
  };
}

export async function getTodoById(id: number): Promise<ITodoAccountBook | null> {
  const todo = await prisma.todo.findUnique({
    where: { id, OR: [{ deletedAt: 0 }, { deletedAt: null }] },
    include: {
      userTodoAccountBooks: {
        include: {
          accountBook: { include: { imageFile: true } },
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
    await prisma.userTodoAccountBook.create({
      data: {
        todoId: createdTodo.id,
        userId: data.userId,
        accountBookId: data.accountBookId,
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
            { userTodoAccountBooks: { some: { userId } } },
            { note: { contains: `"userId":${userId}` } },
          ],
        },
        {
          OR: [{ deletedAt: 0 }, { deletedAt: null }],
        },
      ],
    },
    include: {
      userTodoAccountBooks: {
        include: {
          accountBook: { include: { imageFile: true } },
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
    const existing = await prisma.userTodoAccountBook.findFirst({
      where: { todoId: data.id, userId: data.userId },
    });

    if (existing) {
      await prisma.userTodoAccountBook.update({
        where: { id: existing.id },
        data: { accountBookId: data.accountBookId, updatedAt: now },
      });
    } else {
      await prisma.userTodoAccountBook.create({
        data: {
          todoId: data.id,
          userId: data.userId,
          accountBookId: data.accountBookId,
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
      userTodoAccountBooks: {
        include: {
          accountBook: { include: { imageFile: true } },
        },
      },
    },
  });

  return convertToTodoAccountBook(deletedTodo);
}
