import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/client";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { MISSION_STATUS, TASK_STATUS } from "@/constants/status";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ analysis_id: string }> }
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const user = await getIdentityFromDeWT(authHeader);

    if (!user) {
      return jsonFail(ApiCode.UNAUTHORIZED, "Invalid or expired token");
    }

    const analysisId = (await params).analysis_id;

    const analysis = await prisma.analysis.findUnique({
      where: { id: analysisId },
      include: { mission: true },
    });

    if (!analysis || analysis.userId !== user.id) {
      return jsonFail(ApiCode.FORBIDDEN, "Access denied or Analysis not found");
    }

    const mission = analysis.mission;

    if (!mission) {
      return jsonFail(ApiCode.VALIDATION_ERROR, "No associated mission found");
    }

    if (mission.status !== MISSION_STATUS.FAILED) {
      return jsonFail(ApiCode.VALIDATION_ERROR, "Only failed reports can be retried");
    }

    const missionData = (mission.data as Record<string, unknown>) || {};
    const currentRetryCount = typeof missionData.retryCount === "number" ? missionData.retryCount : 0;

    if (currentRetryCount >= 3) {
      return jsonFail(ApiCode.VALIDATION_ERROR, "Maximum retry limit (3) exceeded, please contact system administrator");
    }

    // Increment retry count
    const updatedData = {
      ...missionData,
      retryCount: currentRetryCount + 1,
    };

    // Transaction to update Mission and Tasks
    await prisma.$transaction(async (tx) => {
      // Reset Mission status
      await tx.mission.update({
        where: { id: mission.id },
        data: {
          status: MISSION_STATUS.PENDING,
          result: Prisma.DbNull,
          data: updatedData,
          updatedAt: new Date(),
        },
      });

      // Reset Failed Tasks to Pending
      await tx.task.updateMany({
        where: {
          missionId: mission.id,
          status: TASK_STATUS.FAILED,
        },
        data: {
          status: TASK_STATUS.PENDING,
          result: Prisma.DbNull,
          updatedAt: new Date(),
        },
      });
    });

    return jsonOk({ success: true, retryCount: currentRetryCount + 1 });
  } catch (error) {
    console.error("[API] /user/analysis/retry POST error:", error);
    return jsonFail(
      ApiCode.INTERNAL_SERVER_ERROR,
      "Failed to retry analysis"
    );
  }
}
