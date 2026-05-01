import React, { useEffect, useRef } from "react";
import { ITask, TaskStatus } from "@/interfaces/mission_board";
import { IRobotRef } from "@/components/admin/mission_board/walking_robot";

export const useMissionBoardDiffEngine = (
  sourceTasks: ITask[],
  displayTasksRef: { current: ITask[] },
  setDisplayTasks: React.Dispatch<React.SetStateAction<ITask[]>>,
  robotRef: React.RefObject<IRobotRef | null>,
  loading: boolean,
) => {
  const isInitialSyncRef = useRef(true);
  const isInitializingRef = useRef(false);

  useEffect(() => {
    if (loading) return;

    const tasksToProcess = sourceTasks;

    if (isInitialSyncRef.current) {
      isInitialSyncRef.current = false;
      isInitializingRef.current = true;

      const total = tasksToProcess.length;
      if (total === 0) {
        isInitializingRef.current = false;
        return;
      }

      const chunkSize = Math.max(1, Math.ceil(total / 5));

      for (let i = 0; i < total; i += chunkSize) {
        const chunk = tasksToProcess.slice(i, i + chunkSize);
        const scale = 1 + Math.log10(chunk.length);
        robotRef.current?.queueAction({
          type: "PICKUP",
          targetZone: "SPAWN",
          blockId: chunk[0].taskId,
          scale,
        });
        robotRef.current?.queueAction({
          type: "DROP",
          targetZone: "OPEN",
          blockId: chunk[0].taskId,
          scale,
          onComplete: () => {
            setDisplayTasks((prev) => {
              const updated = [...prev];
              chunk.forEach((apiTask) => {
                if (!updated.some((t) => t.taskId === apiTask.taskId)) {
                  updated.push({
                    ...apiTask,
                    status: TaskStatus.Open,
                    _trueStatus: apiTask.status,
                  });
                }
              });
              displayTasksRef.current = updated;
              return updated;
            });
          },
        });
      }

      const nonOpen = tasksToProcess.filter(
        (t) => t.status !== TaskStatus.Open,
      );
      for (let i = 0; i < nonOpen.length; i += chunkSize) {
        const chunk = nonOpen.slice(i, i + chunkSize);
        const scale = 1 + Math.log10(chunk.length);
        robotRef.current?.queueAction({
          type: "PICKUP",
          targetZone: "OPEN",
          blockId: chunk[0].taskId,
          scale,
          onComplete: () => {
            setDisplayTasks((prev) => {
              const updated = prev.filter(
                (t) => !chunk.some((c) => c.taskId === t.taskId),
              );
              displayTasksRef.current = updated;
              return updated;
            });
          },
        });
        robotRef.current?.queueAction({
          type: "DROP",
          targetZone: "PENDING_REVIEW",
          blockId: chunk[0].taskId,
          scale,
          onComplete: () => {
            setDisplayTasks((prev) => {
              const updated = [
                ...prev.filter(
                  (t) => !chunk.some((c) => c.taskId === t.taskId),
                ),
              ];
              chunk.forEach((apiTask) => {
                updated.push({
                  ...apiTask,
                  status: TaskStatus.PendingReview,
                  _trueStatus: apiTask.status,
                });
              });
              displayTasksRef.current = updated;
              return updated;
            });
          },
        });
      }

      const closedTasks = tasksToProcess.filter(
        (t) => t.status === TaskStatus.Closed,
      );
      for (let i = 0; i < closedTasks.length; i += chunkSize) {
        const chunk = closedTasks.slice(i, i + chunkSize);
        const scale = 1 + Math.log10(chunk.length);
        robotRef.current?.queueAction({
          type: "PICKUP",
          targetZone: "PENDING_REVIEW",
          blockId: chunk[0].taskId,
          scale,
          onComplete: () => {
            setDisplayTasks((prev) => {
              const updated = prev.filter(
                (t) => !chunk.some((c) => c.taskId === t.taskId),
              );
              displayTasksRef.current = updated;
              return updated;
            });
          },
        });
        robotRef.current?.queueAction({
          type: "DROP",
          targetZone: "CLOSED",
          blockId: chunk[0].taskId,
          scale,
          onComplete: () => {
            setDisplayTasks((prev) => {
              const updated = [
                ...prev.filter(
                  (t) => !chunk.some((c) => c.taskId === t.taskId),
                ),
              ];
              chunk.forEach((apiTask) => {
                updated.push({
                  ...apiTask,
                  status: TaskStatus.Closed,
                  _trueStatus: apiTask.status,
                });
              });
              displayTasksRef.current = updated;
              return updated;
            });
          },
        });
      }

      robotRef.current?.queueAction({
        type: "DROP",
        targetZone: "wander",
        blockId: 0,
        onComplete: () => {
          isInitializingRef.current = false;
        },
      });

      return;
    }

    if (isInitializingRef.current) return;

    const currentDisplay = displayTasksRef.current;
    const getZone = (apiTask: ITask) => {
      return apiTask.status === TaskStatus.Closed
        ? "CLOSED"
        : apiTask.status === TaskStatus.PendingReview
          ? "PENDING_REVIEW"
          : "OPEN";
    };

    tasksToProcess.forEach((apiTask) => {
      const displayTask = currentDisplay.find(
        (d) => d.taskId === apiTask.taskId,
      );

      if (!displayTask) {
        robotRef.current?.queueAction({
          type: "PICKUP",
          targetZone: "SPAWN",
          blockId: apiTask.taskId,
        });
        robotRef.current?.queueAction({
          type: "DROP",
          targetZone: getZone(apiTask),
          blockId: apiTask.taskId,
          onComplete: () => {
            setDisplayTasks((prev) => {
              if (prev.some((t) => t.taskId === apiTask.taskId)) return prev;
              const updated = [apiTask, ...prev];
              displayTasksRef.current = updated;
              return updated;
            });
          },
        });
      } else if (displayTask.status !== apiTask.status) {
        const oldZone = getZone(displayTask);
        const newZone = getZone(apiTask);

        if (oldZone !== newZone) {
          robotRef.current?.queueAction({
            type: "PICKUP",
            targetZone: oldZone,
            blockId: apiTask.taskId,
            onComplete: () => {
              setDisplayTasks((prev) => {
                const updated = prev.filter((t) => t.taskId !== apiTask.taskId);
                displayTasksRef.current = updated;
                return updated;
              });
            },
          });
          robotRef.current?.queueAction({
            type: "DROP",
            targetZone: newZone,
            blockId: apiTask.taskId,
            onComplete: () => {
              setDisplayTasks((prev) => {
                const updated = [
                  apiTask,
                  ...prev.filter((t) => t.taskId !== apiTask.taskId),
                ];
                displayTasksRef.current = updated;
                return updated;
              });
            },
          });
        } else {
          setDisplayTasks((prev) => {
            const updated = prev.map((t) =>
              t.taskId === apiTask.taskId ? apiTask : t,
            );
            displayTasksRef.current = updated;
            return updated;
          });
        }
      } else {
        setDisplayTasks((prev) => {
          const updated = prev.map((t) =>
            t.taskId === apiTask.taskId ? apiTask : t,
          );
          displayTasksRef.current = updated;
          return updated;
        });
      }
    });

    currentDisplay.forEach((dTask) => {
      if (!tasksToProcess.find((a) => a.taskId === dTask.taskId)) {
        setDisplayTasks((prev) => {
          const updated = prev.filter((t) => t.taskId !== dTask.taskId);
          displayTasksRef.current = updated;
          return updated;
        });
      }
    });
  }, [sourceTasks, loading, displayTasksRef, robotRef, setDisplayTasks]);
};
