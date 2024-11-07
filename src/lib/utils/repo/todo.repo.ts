import prisma from '@/client';
import { getTimestampNow, timestampInSeconds } from '@/lib/utils/common';
import { Prisma, Todo } from '@prisma/client';

// Info: (20241107 - Jacky) Create a new Todo
export async function createTodo(
  userId: number,
  companyId: number,
  name: string,
  deadline: number,
  note: string | null
) {
  const now = Date.now();
  const nowTimestamp = timestampInSeconds(now);
  const newTodo = await prisma.todo.create({
    data: {
      name,
      deadline,
      note,
      status: true,
      createdAt: nowTimestamp,
      updatedAt: nowTimestamp,
      userTodoCompanies: {
        create: {
          userId,
          companyId,
          createdAt: nowTimestamp,
          updatedAt: nowTimestamp,
        },
      },
    },
    include: {
      userTodoCompanies: {
        include: {
          company: {
            include: {
              imageFile: true,
            },
          },
        },
      },
    },
  });
  return newTodo;
}

// Info: (20241107 - Jacky) List all Todos
export async function listTodo(userId: number) {
  const todos = await prisma.todo.findMany({
    where: {
      userTodoCompanies: {
        some: {
          userId,
        },
      },
      OR: [{ deletedAt: 0 }, { deletedAt: null }],
    },
    include: {
      userTodoCompanies: {
        include: {
          company: {
            include: {
              imageFile: true,
            },
          },
        },
      },
    },
  });
  return todos;
}

// Info: (20241107 - Jacky) Get a Todo by ID
export async function getTodoById(id: number) {
  let todo = null;
  if (id > 0) {
    todo = await prisma.todo.findUnique({
      where: {
        id,
        OR: [{ deletedAt: 0 }, { deletedAt: null }],
      },
      include: {
        userTodoCompanies: {
          include: {
            company: {
              include: {
                imageFile: true,
              },
            },
          },
        },
      },
    });
  }
  return todo;
}

// Info: (20241107 - Jacky) Update a Todo
export async function updateTodo(
  id: number,
  companyId: number,
  name: string,
  deadline: number,
  note: string | null
) {
  const nowInSecond = getTimestampNow();
  const updatedTodo = await prisma.todo.update({
    where: {
      id,
      deletedAt: null,
    },
    data: {
      name,
      deadline,
      note,
      updatedAt: nowInSecond,
      userTodoCompanies: {
        updateMany: {
          where: {
            todoId: id,
          },
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
            include: {
              imageFile: true,
            },
          },
        },
      },
    },
  });
  return updatedTodo;
}

// Info: (20241107 - Jacky) Soft delete a Todo
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
            include: {
              imageFile: true,
            },
          },
        },
      },
    },
  });
  return deletedTodo;
}

// Info: (20241107 - Jacky) Real delete for testing
export async function deleteTodoForTesting(id: number): Promise<Todo> {
  const where: Prisma.TodoWhereUniqueInput = {
    id,
  };
  const deletedTodo = await prisma.todo.delete({
    where,
  });
  return deletedTodo;
}
