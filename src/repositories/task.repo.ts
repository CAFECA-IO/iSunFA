import { prisma } from '@/lib/prisma';
import { Prisma, Mission, Task } from '@/generated/client';
import { MISSION_STATUS, TASK_STATUS } from '@/constants/status';

export interface ITaskRepository {
  findNextPendingTask(): Promise<{ task: Task, mission: Mission } | null>;
  findNextTaskInMission(mission: Prisma.MissionGetPayload<{ include: { tasks: true } }>): Promise<Task | null>;
  getTasksByOrder(missionId: string, order: number): Promise<Task[]>;
  getTasksBeforeOrder(missionId: string, currentOrder: number): Promise<Task[]>;
  updateStatus(taskId: string, status: string, result?: Prisma.InputJsonValue): Promise<Task>;
  completeMission(missionId: string, status: string, result?: Prisma.InputJsonValue): Promise<Mission>;
  checkMissionCompletion(missionId: string): Promise<boolean>;
  resetAllRunningTasks(): Promise<{ count: number }>;
}

export class TaskRepository implements ITaskRepository {
  /**
   * Info: (20260130 - Luphia) Find the next pending task.
   * Logic:
   * 1. Find oldest Mission that is PENDING or RUNNING.
   * 2. Find the lowest task order that has PENDING tasks.
   * 3. Return a PENDING task from that order.
   * 
   * Note: This is a simplified version. For robustness, we might want to lock tasks.
   */
  async findNextPendingTask() {
    // Info: (20260130 - Luphia) 1. Find oldest active mission
    const mission = await prisma.mission.findFirst({
      where: {
        status: { in: [MISSION_STATUS.PENDING, MISSION_STATUS.RUNNING] }
      },
      orderBy: {
        createdAt: 'asc'
      },
      include: {
        tasks: {
          orderBy: {
            order: 'asc'
          }
        }
      }
    });

    if (!mission) return null;

    console.log(`\n[TaskRepo] Evaluating active Mission: ${mission.id}`);
    const task = await this.findNextTaskInMission(mission);
    if (!task) return null;

    return { task, mission };
  }

  /**
   * Info: (20260130 - Luphia) 2. Determine current execution order for this mission
   * We can't proceed to order N until all tasks of order N-1 are COMPLETED.
   * Let's group tasks by order.
   * Since they are ordered by 'order', we can iterate.
   */
  async findNextTaskInMission(mission: Prisma.MissionGetPayload<{ include: { tasks: true } }>) {
    const tasksByOrder = new Map<number, typeof mission.tasks>();

    for (const task of mission.tasks) {
      if (!tasksByOrder.has(task.order)) {
        tasksByOrder.set(task.order, []);
      }
      tasksByOrder.get(task.order)?.push(task);
    }

    // Info: (20260130 - Luphia) Sort orders
    const orders = Array.from(tasksByOrder.keys()).sort((a, b) => a - b);

    for (const order of orders) {
      const tasks = tasksByOrder.get(order) || [];
      const hasPending = tasks.some(t => t.status === TASK_STATUS.PENDING);
      const hasRunning = tasks.some(t => t.status === TASK_STATUS.RUNNING);

      if (hasPending || hasRunning) {
        // Info: (20260130 - Luphia) This is the current active order level

        // Info: (20260130 - Luphia) Safety check: Are all tasks from previous order completed?
        if (order > 0) {
          const prevTasks = tasksByOrder.get(order - 1) || [];
          const prevCompleted = prevTasks.every(t => t.status === TASK_STATUS.COMPLETED || t.status === TASK_STATUS.SKIPPED);
          if (!prevCompleted) {
            /**
             * Info: (20260130 - Luphia)
             * Previous order not finished, cannot start this order yet.
             * This shouldn't happen if we process strictly, but handled here.
             * Wait for previous order
             */
            console.log(`[TaskRepo] Mission ${mission.id}: Waiting for order ${order - 1} to complete. Cannot start order ${order}.`);
            return null;
          }
        }

        // Info: (20260310 - Tzuhan) Detect and recover stuck RUNNING tasks (e.g. timeout after 10 mins)
        if (hasRunning) {
          const stuckTask = tasks.find(t => {
            if (t.status === TASK_STATUS.RUNNING && t.updatedAt) {
              const diffMs = new Date().getTime() - t.updatedAt.getTime();
              return diffMs > 10 * 60 * 1000; // Info: (20260310 - Tzuhan) 10 minutes timeout
            }
            return false;
          });
          if (stuckTask) {
            const dataPreview = stuckTask.data ? JSON.stringify(stuckTask.data) : '{}';
            console.log(`[TaskRepo] Mission ${mission.id}: Recovering stuck task [${stuckTask.id}] (Order: ${order}, Type: ${stuckTask.type})`);
            console.log(`[TaskRepo] -> Task Content: ${dataPreview.substring(0, 300)}...`);
            return stuckTask;
          }
        }

        if (hasPending) {
          const pendingTask = tasks.find(t => t.status === TASK_STATUS.PENDING);
          if (pendingTask) {
            const dataPreview = pendingTask.data ? JSON.stringify(pendingTask.data) : '{}';
            console.log(`[TaskRepo] Mission ${mission.id}: Found next task [${pendingTask.id}] (Order: ${order}, Type: ${pendingTask.type})`);
            console.log(`[TaskRepo] -> Task Content: ${dataPreview.substring(0, 300)}...`);
            return pendingTask;
          }
        }

        // Info: (20260130 - Luphia) If only RUNNING tasks exist in this order and none are stuck, we wait.
        console.log(`[TaskRepo] Mission ${mission.id}: Order ${order} currently has RUNNING tasks. Waiting for them to finish...`);
        tasks.filter(t => t.status === TASK_STATUS.RUNNING).forEach(t => {
          const dataPreview = t.data ? JSON.stringify(t.data) : '{}';
          console.log(`[TaskRepo] -> Blocking Task [${t.id}] (Type: ${t.type}) running since ${t.updatedAt?.toLocaleString('zh-TW', { hour12: false })}`);
          console.log(`[TaskRepo] -> Content: ${dataPreview.substring(0, 150)}...`);
        });
        return null;
      }

      // Info: (20260130 - Luphia) If all completed, continue to next order
    }

    return null;
  }

  async getTasksByOrder(missionId: string, order: number) {
    return prisma.task.findMany({
      where: {
        missionId,
        order
      }
    });
  }

  async getTasksBeforeOrder(missionId: string, currentOrder: number) {
    return prisma.task.findMany({
      where: {
        missionId,
        order: {
          lt: currentOrder
        }
      },
      orderBy: {
        order: 'asc'
      }
    });
  }

  async updateStatus(taskId: string, status: string, result?: Prisma.InputJsonValue) {
    return prisma.task.update({
      where: { id: taskId },
      data: {
        status,
        result: result ?? undefined,
        updatedAt: new Date()
      }
    });
  }

  async completeMission(missionId: string, status: string, result?: Prisma.InputJsonValue) {
    return prisma.mission.update({
      where: { id: missionId },
      data: {
        status,
        result: result ?? undefined,
        updatedAt: new Date()
      }
    });
  }

  async resetAllRunningTasks() {
    return prisma.task.updateMany({
      where: { status: TASK_STATUS.RUNNING },
      data: { status: TASK_STATUS.PENDING }
    });
  }

  async checkMissionCompletion(missionId: string): Promise<boolean> {
    const counts = await prisma.task.groupBy({
      by: ['status'],
      where: { missionId },
      _count: true
    });

    /**
     * Info: (20260130 - Luphia)
     * If any task is not COMPLETED/SKIPPED/FAILED (if we allow failure), mission is not done.
     * But typically "COMPLETED".
     */
    const pending = counts.find(c => c.status === TASK_STATUS.PENDING)?._count ?? 0;
    const running = counts.find(c => c.status === TASK_STATUS.RUNNING)?._count ?? 0;

    return pending === 0 && running === 0;
  }
}

export const taskRepo = new TaskRepository();
