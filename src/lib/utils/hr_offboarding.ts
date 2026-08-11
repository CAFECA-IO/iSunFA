import {
  ACCOUNT_REVOKE_DEFAULT_TIME,
  CertificateState,
  HandoverCategory,
  HandoverItemState,
  MONTHLY_PAYROLL_DAYS,
  OFFBOARDING_APPROVAL_KEY,
  OFFBOARDING_ASSET_KEYS,
  OFFBOARDING_INSURANCE_KEYS,
  OFFBOARDING_REVOKE_KEYS,
  OffboardingModalTab,
  OffboardingTaskKey,
  ProcessTaskStatus,
  RESIGNATION_REASONS,
  ResignationReason,
} from "@/constants/hr_management";
import {
  IAccountRevokeItem,
  IHandoverItem,
  IInsuranceItem,
  INoticePeriodCheck,
  IOffboardingAsset,
  IOffboardingCase,
  IOffboardingForm,
  IOffboardingProgress,
  IProcessTask,
} from "@/interfaces/hr_management";
import {
  differenceInDays,
  differenceInFullMonths,
  parseIsoDate,
} from "@/lib/utils/hr_date";
import {
  resolveRequiredNoticeDays,
  toProgressPercent,
} from "@/lib/utils/hr_movement";

/**
 * Info: (20260811 - Julian) 離職流程 Modal 的計算層。
 *
 * 這裡不碰畫面，只做兩件事：把既有的交接任務攤成表單能編輯的形狀，
 * 以及把表單算回三個進度百分比。兩個方向都要走同一組鍵值（`taskId`），
 * 否則在 Modal 裡勾掉的項目不會反映到看板 —— 使用者會看到同一件事
 * 在兩個畫面有兩種答案。
 */

function isDone(task: IProcessTask): boolean {
  return task.status !== ProcessTaskStatus.PENDING;
}

function findByKeys(tasks: IProcessTask[], keys: string[]): IProcessTask[] {
  // Info: (20260811 - Julian) 依 keys 的順序回傳，讓畫面上的排列與範本一致
  return keys
    .map((key) => tasks.find((task) => task.templateKey === key))
    .filter((task): task is IProcessTask => task !== undefined);
}

/**
 * Info: (20260811 - Julian) 預告期檢核。
 *
 * 離職日在 Modal 裡改得動，因此不能沿用案件上算好的天數 ——
 * 把預定離職日往前拉三週卻還顯示「符合預告期」，正是這個檢核要防的事。
 */
export function resolveNoticeCheck(
  hireDateIso: string,
  noticeDateIso: string,
  leaveDateIso: string,
): INoticePeriodCheck {
  const leaveDate = parseIsoDate(leaveDateIso);
  const tenureMonths = differenceInFullMonths(
    parseIsoDate(hireDateIso),
    leaveDate,
  );
  const requiredDays = resolveRequiredNoticeDays(tenureMonths);
  const actualDays = Math.max(
    0,
    differenceInDays(parseIsoDate(noticeDateIso), leaveDate),
  );
  return {
    requiredDays,
    actualDays,
    isSatisfied: actualDays >= requiredDays,
    shortageDays: Math.max(0, requiredDays - actualDays),
  };
}

/**
 * Info: (20260811 - Julian) 未休特休折算工資。
 *
 * 一日工資 = 月薪 ÷ 30（勞基法施行細則第 24-1 條），取整到元。
 * ToDo: (20260811 - Julian) 真實結算還要併入當月未領薪資、資遣費與代扣項目，
 * 這裡只估「特休未休」這一項，畫面上必須標明是預估值。
 */
export function estimateLeavePayout(
  remainingLeaveDays: number,
  monthlySalary: number,
): number {
  if (remainingLeaveDays <= 0 || monthlySalary <= 0) return 0;
  return Math.round(
    (monthlySalary / MONTHLY_PAYROLL_DAYS) * remainingLeaveDays,
  );
}

/** Info: (20260811 - Julian) 依員工 id 取一個固定的離職原因，避免每次進畫面都不一樣 */
function resolveMockReason(employeeId: string): ResignationReason {
  const sum = [...employeeId].reduce(
    (total, char) => total + char.charCodeAt(0),
    0,
  );
  return RESIGNATION_REASONS[sum % RESIGNATION_REASONS.length];
}

/**
 * Info: (20260811 - Julian) 由既有任務推導出 Modal 的初始表單。
 *
 * 表單不是憑空生出來的一份新資料，而是同一批任務的另一種排版 ——
 * 工作交接列、資產列、停權列、退保列全部帶著 `taskId` 回去，
 * 勾選才有辦法同步回看板與右側矩陣。
 *
 * ToDo: (20260811 - Julian) 接 API 後改讀 `/api/v1/hr/offboarding/{id}`，
 * 這個函式只保留「補齊預設值」的部分。
 */
export function buildOffboardingForm(
  offboardingCase: IOffboardingCase,
): IOffboardingForm {
  const { tasks } = offboardingCase;

  /**
   * Info: (20260811 - Julian) 驗收任務不算交接項目 ——
   * 它是「確認上面那些都做完了」，放進清單裡會變成自己驗收自己。
   */
  const approvalTask = tasks.find(
    (task) => task.templateKey === OFFBOARDING_APPROVAL_KEY,
  );

  const handoverItems: IHandoverItem[] = tasks
    .filter(
      (task) =>
        task.category === HandoverCategory.WORK &&
        task.templateKey !== OFFBOARDING_APPROVAL_KEY,
    )
    .map((task) => ({
      id: task.id,
      taskId: task.id,
      title: task.title,
      link: "",
      state: isDone(task) ? HandoverItemState.DONE : HandoverItemState.PENDING,
      isConfirmed: isDone(task),
    }));

  const assets: IOffboardingAsset[] = findByKeys(
    tasks,
    OFFBOARDING_ASSET_KEYS,
  ).map((task) => ({
    taskId: task.id,
    name: task.title,
    assetNo: task.assetNo,
    category: task.category,
    assigneeName: task.assigneeName,
    isReturned: isDone(task),
    returnedDate: task.completedDate ?? "",
    note: task.note ?? "",
  }));

  const revokes: IAccountRevokeItem[] = findByKeys(
    tasks,
    OFFBOARDING_REVOKE_KEYS,
  ).map((task) => ({
    taskId: task.id,
    title: task.title,
    isDone: isDone(task),
    scheduledAt:
      task.scheduledAt ??
      `${offboardingCase.keyDate}T${ACCOUNT_REVOKE_DEFAULT_TIME}`,
  }));

  const insurances: IInsuranceItem[] = findByKeys(
    tasks,
    OFFBOARDING_INSURANCE_KEYS,
  ).map((task) => ({
    taskId: task.id,
    title: task.title,
    isDone: isDone(task),
    /**
     * Info: (20260811 - Julian) 退保生效日預設為最後一天，不是申報日。
     * 保險效力止於在職最後一天，用申報日會讓人以為晚報就晚退。
     */
    effectiveDate: task.completedDate ?? offboardingCase.keyDate,
  }));

  const certificateTask = tasks.find(
    (task) => task.templateKey === OffboardingTaskKey.CERTIFICATE,
  );

  return {
    reason: resolveMockReason(offboardingCase.employeeId),
    reasonNote: "",
    expectedLeaveDate: offboardingCase.keyDate,
    // Info: (20260811 - Julian) 最後工作日預設同離職日，特休折抵時才會不一樣
    lastWorkingDate: offboardingCase.keyDate,
    insuranceOffDate: offboardingCase.keyDate,
    handoverAssigneeId: "",
    handoverItems,
    approvalTaskId: approvalTask?.id ?? null,
    isApproved: approvalTask !== undefined && isDone(approvalTask),
    /**
     * Info: (20260811 - Julian) 沒有經辦人就退回指派對象 ——
     * 「已驗收但不知道誰驗的」比「寫上負責主管」更沒有用。
     */
    approvedBy:
      approvalTask && isDone(approvalTask)
        ? (approvalTask.completedBy ?? approvalTask.assigneeName)
        : null,
    approvedAt:
      approvalTask && isDone(approvalTask) ? approvalTask.completedDate : null,
    assets,
    revokes,
    mailForwardTo: "",
    insurances,
    remainingLeaveDays: 0,
    monthlySalary: 0,
    certificateState:
      certificateTask && isDone(certificateTask)
        ? CertificateState.SENT
        : CertificateState.NOT_ISSUED,
    certificateTaskId: certificateTask?.id ?? null,
    notes: {
      [OffboardingModalTab.APPLICATION]: "",
      [OffboardingModalTab.HANDOVER]: "",
      [OffboardingModalTab.ASSET]: "",
      [OffboardingModalTab.FINALIZATION]: "",
    },
  };
}

/**
 * Info: (20260811 - Julian) 把使用者的編輯疊回「由任務重新推導」的表單上。
 *
 * 表單不能整份存進 state：勾選狀態同時活在任務裡，使用者可能在右側交接矩陣
 * 或看板上改動同一筆任務。整份沿用舊表單的話，重新打開 Modal 會看到
 * 一份停在上次的快照 —— 而那份快照跟其他畫面說的不是同一件事。
 *
 * 因此每次都由現在的任務重建 `base`，再把「任務裡沒有的欄位」
 * （連結、損壞紀錄、退保生效日、備註⋯⋯）從使用者的編輯疊回去。
 */
export function mergeOffboardingForm(
  base: IOffboardingForm,
  saved: IOffboardingForm,
): IOffboardingForm {
  const savedItemById = new Map(
    saved.handoverItems.map((item) => [item.id, item]),
  );
  const baseItemById = new Map(
    base.handoverItems.map((item) => [item.id, item]),
  );

  /**
   * Info: (20260811 - Julian) 範本列以 base 為準（可能已在別處被改動），
   * 使用者自己加的列（taskId 為 null）只存在這份表單裡，原樣保留。
   */
  const handoverItems: IHandoverItem[] = [
    ...base.handoverItems.map((item) => {
      const savedItem = savedItemById.get(item.id);
      if (!savedItem) return item;
      return {
        ...item,
        link: savedItem.link,
        isConfirmed: savedItem.isConfirmed,
      };
    }),
    ...saved.handoverItems.filter(
      (item) => item.taskId === null && !baseItemById.has(item.id),
    ),
  ];

  const savedAssetById = new Map(
    saved.assets.map((asset) => [asset.taskId, asset]),
  );
  const savedRevokeById = new Map(
    saved.revokes.map((item) => [item.taskId, item]),
  );
  const savedInsuranceById = new Map(
    saved.insurances.map((item) => [item.taskId, item]),
  );

  return {
    ...saved,
    handoverItems,
    approvalTaskId: base.approvalTaskId,
    /**
     * Info: (20260811 - Julian) 是否已驗收由任務決定，時間戳優先用這次簽核留下的。
     * 任務只存得下日期，剛按完簽核的那一筆才有時分。
     */
    isApproved: base.isApproved,
    approvedBy: base.isApproved ? (saved.approvedBy ?? base.approvedBy) : null,
    approvedAt: base.isApproved ? (saved.approvedAt ?? base.approvedAt) : null,
    assets: base.assets.map((asset) => {
      const savedAsset = savedAssetById.get(asset.taskId);
      if (!savedAsset) return asset;
      return {
        ...asset,
        returnedDate: asset.isReturned ? savedAsset.returnedDate : "",
        note: savedAsset.note,
      };
    }),
    revokes: base.revokes.map((item) => ({
      ...item,
      scheduledAt:
        savedRevokeById.get(item.taskId)?.scheduledAt ?? item.scheduledAt,
    })),
    insurances: base.insurances.map((item) => ({
      ...item,
      effectiveDate:
        savedInsuranceById.get(item.taskId)?.effectiveDate ??
        item.effectiveDate,
    })),
    certificateTaskId: base.certificateTaskId,
    /**
     * Info: (20260811 - Julian) 證明書任務被別處標記完成時，狀態一律升到「已發送」。
     * 反過來不成立：使用者在這裡按過預覽，任務仍然是未完成。
     */
    certificateState:
      base.certificateState === CertificateState.SENT
        ? CertificateState.SENT
        : saved.certificateState,
  };
}

/**
 * Info: (20260811 - Julian) 底部進度總覽的三個百分比。
 *
 * 每個分頁各自把「還差什麼才算完成」算進分母：工作交接要含主管驗收
 * （項目全交接了但沒人驗收，流程仍然停在那裡），HR 結案要含證明書發放。
 * 只數勾選框的話，這兩件最常被漏掉的事永遠不會出現在百分比裡。
 */
export function buildOffboardingProgress(
  form: IOffboardingForm,
): IOffboardingProgress {
  const handoverDone = form.handoverItems.filter(
    (item) => item.state === HandoverItemState.DONE,
  ).length;
  // Info: (20260811 - Julian) 驗收本身也是一筆任務，因此分母含它時分子也是任務推導的
  const isApproved = form.isApproved;

  const assetDone = form.assets.filter((asset) => asset.isReturned).length;
  const revokeDone = form.revokes.filter((item) => item.isDone).length;

  const insuranceDone = form.insurances.filter((item) => item.isDone).length;
  const isCertificateSent = form.certificateState === CertificateState.SENT;

  return {
    handoverPercent: toProgressPercent(
      handoverDone + (isApproved ? 1 : 0),
      form.handoverItems.length + 1,
    ),
    assetPercent: toProgressPercent(
      assetDone + revokeDone,
      form.assets.length + form.revokes.length,
    ),
    finalizationPercent: toProgressPercent(
      insuranceDone + (isCertificateSent ? 1 : 0),
      form.insurances.length + 1,
    ),
  };
}
