import { prisma } from "@/lib/prisma";
import {
  LeaveCashOutReason,
  LeaveGrantSource,
  LeaveLedgerEntryType,
} from "@/constants/leave_policy";
import {
  buildOvertimeGrantIdempotencyKey,
  OvertimeCompensationMode,
  OvertimeEvidenceBasis,
  OvertimeFilingType,
  OvertimeRequestStatus,
} from "@/constants/overtime";
import {
  IOvertimeSegment,
  OvertimeDecisionOutcome,
} from "@/interfaces/overtime";
import { deriveCompensatoryGrantDays } from "@/lib/overtime_rules";
import {
  sumLedgerMinutes,
  writeBalance,
} from "@/repositories/leave_grant.repo";
import { assertGrantSource } from "@/repositories/leave_grant_invariant";
import {
  assertEmergencyDeclaration,
  assertOvertimeEmergencyRecord,
  assertOvertimeFilingType,
  assertOvertimeSegmentPremium,
  IStorableOvertimeRequest,
} from "@/repositories/overtime_request_invariant";

/**
 * Info: (20260818 - Julian) 加班單的寫入端。
 *
 * ## 核准是一個 unit-of-work
 *
 * 「改狀態、寫分段、換補休（或產折現事件）」三件事少任一步就會留下一個
 * 永久說謊的中間狀態：狀態說已核准但沒有分段，總量加起來是 0；
 * 有分段沒有補休批次，員工的加班換到的是一場空。原子性只有 DB 給得起
 * （同 `leave.repo.ts` 的 `resolveRecall`，判準見 coding_guidelines §1.1）。
 *
 * ## 為什麼分段一筆一筆建而不是 `createMany`
 *
 * 換補休時每一段都要掛一筆 `LeaveGrant`，而 `createMany` 不回 id。
 * 一次 3 小時平日加班切成兩段就是兩批補休，級距跟著批次走（ADR 024 §5.2）——
 * 拿不到 id 就掛不上去。
 *
 * ## 狀態轉移用附條件更新
 *
 * `updateMany(where: { status: PENDING })` 的 `count === 0` 即「已被決行」，
 * 而不是先讀再寫 —— 兩個分頁同時按核准時，先讀再寫會兩邊都通過。
 */

export interface IOvertimeApprovalWrite {
  accountBookId: string;
  requestId: string;
  employeeId: string;
  workDate: string;
  actorEmployeeId: string;
  approvedMinutes: number;
  recognizedMinutes: number;
  /**
   * Info: (20260818 - Julian) 佐證來源在**核准當下**才定得了 —— 送出時還不知道
   * 那一天有沒有打卡。由 service 依實際打卡判定後傳進來，與狀態同一次更新落地：
   * 停在送出時填的 `PUNCH_RECORD`，會讓一筆完全沒有出勤紀錄的認列
   * 在 L28 的佐證來源欄裡混進「有打卡佐證」那一格（ADR 024 §2.2）。
   */
  evidenceBasis: OvertimeEvidenceBasis;
  /**
   * Info: (20260819 - Julian) 核准**不碰**報備欄位（review B7）。
   *
   * §32 IV 的認定是 HR 在核准之前做的另一件事（`declareEmergency`），
   * 那三個欄位在那一步就已經落地並驗過。這裡再寫一次沒有意義，
   * 而且會要求 service 把「認定者是誰」一路帶到核准 —— 那是稽核用的資訊，
   * 不該為了一次不必要的寫入而外拋到清單的視圖裡。
   *
   * 因此這張表的報備欄位只有兩個寫入者：`create`（一律為空）與
   * `declareEmergency`（三者俱全），兩者都各自呼叫
   * `assertOvertimeEmergencyRecord`。
   */
  segments: readonly IOvertimeSegment[];
  /**
   * Info: (20260820 - Julian) **分段是照哪一個 `isEmergency` 算出來的**（review 第 3 條）。
   *
   * 不是要寫進去的值 —— 核准不碰這一欄（見上方）。它是**樂觀鎖的比較基準**：
   * service 在 `:318` 讀出旗標算好分段，中間還隔著數次查詢，而 HR 的
   * `declareEmergency` 只要求 `status = PENDING`，那段窗口對它完全敞開。
   * 交錯之後這張單會同時是「已依 §32 IV 報備」與「按普通級距算完錢」，
   * 而分段、補休批次、折現事件都已經在同一筆交易裡寫好了。
   *
   * `declareEmergency` 的註解只說得出反方向（「主管隨時可能在 HR 按下去的
   * 同一秒核准掉」），那一頭由 `status = PENDING` 擋著；這一欄擋的是另一頭。
   */
  isEmergencyAtDerivation: boolean;
  engineVersion: number;
  /** Info: (20260818 - Julian) 由 service 組好，repository 只負責在寫入前擋一次 */
  invariant: IStorableOvertimeRequest;
  /** Info: (20260818 - Julian) 選 `COMPENSATORY_LEAVE` 時有值 */
  compensatory: {
    leavePolicyId: string;
    dayEquivalentMinutes: number;
    expiresOn: string;
  } | null;
  /** Info: (20260818 - Julian) 選 `PAYMENT` 時有值 */
  cashOut: {
    dayEquivalentMinutes: number;
    legalBasis: string;
  } | null;
}

export interface IOvertimeApprovalWriteResult {
  outcome: OvertimeDecisionOutcome;
  grantCount: number;
  cashOutEventIds: string[];
}

export interface IOvertimeRequestRepository {
  create(params: {
    accountBookId: string;
    employeeId: string;
    workDate: string;
    filingType: OvertimeFilingType;
    compensationMode: OvertimeCompensationMode;
    evidenceBasis: OvertimeEvidenceBasis;
    requestedStartMinute: number;
    requestedEndMinute: number;
    reason: string;
    isEmergency: boolean;
    emergencyReportUrl: string | null;
    emergencyReportedAt: Date | null;
    emergencyDeclaredByEmployeeId: string | null;
    invariant: IStorableOvertimeRequest;
  }): Promise<string>;
  approve(
    params: IOvertimeApprovalWrite,
  ): Promise<IOvertimeApprovalWriteResult>;
  /**
   * Info: (20260819 - Julian) HR 登記 §32 IV 的報備（review B7）。
   *
   * 附條件更新（`status = PENDING`）而不是先讀再寫：認定與核准是**兩個人
   * 在兩個畫面上做的兩件事**，主管隨時可能在 HR 按下去的同一秒核准掉。
   * `count === 0` 即「已被決行」—— 那時候再蓋上旗標，會讓一張已經按
   * 普通級距算完錢的單子突然變成加倍發給，而分段早就寫好了。
   *
   * Info: (20260820 - Julian) 這一條只擋得住**「核准先、認定後」**（review 第 3 條）。
   * 反方向（認定卡進核准的計算過程中間）status 全程都是 PENDING，這裡看不見；
   * 由 `approve` 的 `where` 多帶一個 `isEmergency` 擋（見 `isEmergencyAtDerivation`）。
   */
  declareEmergency(params: {
    accountBookId: string;
    requestId: string;
    emergencyReportUrl: string;
    emergencyReportedAt: Date;
    emergencyDeclaredByEmployeeId: string;
  }): Promise<OvertimeDecisionOutcome>;
  /**
   * Info: (20260820 - Julian) 撤回 §32 IV 的認定（review 第 3 輪第 2 條）。
   *
   * 與認定對稱：附條件更新要求 `isEmergency = true`，於是「撤回一份不存在的
   * 認定」與「兩個人同時撤回」都落在 `count === 0`，而不是安靜地成功。
   * 歷史列不刪，只補上撤回的三欄。
   */
  revokeEmergency(params: {
    accountBookId: string;
    requestId: string;
    revokedByEmployeeId: string;
    revokedAt: Date;
    revokeReason: string;
  }): Promise<OvertimeDecisionOutcome>;
  reject(params: {
    accountBookId: string;
    requestId: string;
  }): Promise<OvertimeDecisionOutcome>;
  /**
   * Info: (20260818 - Julian) 申請人撤回。與 `reject` 同樣是附條件更新 ——
   * 差別在於它同時把撤回的時點與理由固化下來。
   */
  withdraw(params: {
    accountBookId: string;
    requestId: string;
    withdrawnAt: Date;
    withdrawReason: string | null;
  }): Promise<OvertimeDecisionOutcome>;
}

class OvertimeRequestRepository implements IOvertimeRequestRepository {
  public async create(params: {
    accountBookId: string;
    employeeId: string;
    workDate: string;
    filingType: OvertimeFilingType;
    compensationMode: OvertimeCompensationMode;
    evidenceBasis: OvertimeEvidenceBasis;
    requestedStartMinute: number;
    requestedEndMinute: number;
    reason: string;
    isEmergency: boolean;
    emergencyReportUrl: string | null;
    emergencyReportedAt: Date | null;
    emergencyDeclaredByEmployeeId: string | null;
    invariant: IStorableOvertimeRequest;
  }): Promise<string> {
    assertOvertimeFilingType(params.invariant);
    assertOvertimeEmergencyRecord(params);

    const created = await prisma.overtimeRequest.create({
      data: {
        accountBookId: params.accountBookId,
        employeeId: params.employeeId,
        workDate: params.workDate,
        filingType: params.filingType,
        compensationMode: params.compensationMode,
        evidenceBasis: params.evidenceBasis,
        requestedStartMinute: params.requestedStartMinute,
        requestedEndMinute: params.requestedEndMinute,
        reason: params.reason,
        isEmergency: params.isEmergency,
        emergencyReportUrl: params.emergencyReportUrl,
        emergencyReportedAt: params.emergencyReportedAt,
        emergencyDeclaredByEmployeeId: params.emergencyDeclaredByEmployeeId,
        status: OvertimeRequestStatus.PENDING,
      },
      select: { id: true },
    });
    return created.id;
  }

  public async approve(
    params: IOvertimeApprovalWrite,
  ): Promise<IOvertimeApprovalWriteResult> {
    assertOvertimeFilingType(params.invariant);
    /**
     * Info: (20260820 - Julian) 級距與旗標必須一致（review 第 3 條）。
     *
     * 擋在交易之外：這一條純粹看參數，不需要 DB。真正的併發防護是下面
     * `where` 裡的 `isEmergency` —— 兩者分工不同，這一條擋的是「呼叫端自己
     * 就算錯了」（遷移腳本、未來的更正流程），那一條擋的是「算對了但中途被改」。
     */
    assertOvertimeSegmentPremium({
      isEmergency: params.isEmergencyAtDerivation,
      segments: params.segments,
    });

    return prisma.$transaction(async (tx) => {
      const moved = await tx.overtimeRequest.updateMany({
        where: {
          id: params.requestId,
          accountBookId: params.accountBookId,
          status: OvertimeRequestStatus.PENDING,
          /**
           * Info: (20260820 - Julian) 把「我算的時候它是這個值」納入 claim（review 第 3 條）。
           *
           * 只 claim `status` 的話，HR 在 service 讀出旗標之後、交易開始之前
           * 按下認定，這裡仍然 `count === 1`，於是普通級距的分段連同補休批次
           * 一起落地在一張已經標記為天災事變的單子上 —— 那個狀態沒有任何
           * 後續流程會回頭修正，而它在薪資結算日才會以「少算的工資」現形。
           */
          isEmergency: params.isEmergencyAtDerivation,
        },
        data: {
          status: OvertimeRequestStatus.APPROVED,
          approvedMinutes: params.approvedMinutes,
          recognizedMinutes: params.recognizedMinutes,
          evidenceBasis: params.evidenceBasis,
        },
      });
      if (moved.count === 0) {
        /**
         * Info: (20260820 - Julian) 兩種落空要分得出來（review 第 3 條）。
         *
         * `count === 0` 現在有兩個成因：已經被決行，或是還在 PENDING 但旗標
         * 變了。回同一種結局的話，主管會看到「此加班單已決行」而不再處理，
         * 而那張單其實還在等他 —— 一句安撫的錯誤訊息把一張單子變成孤兒。
         *
         * 這一讀只用來**分類錯誤訊息**，不參與判斷是否寫入（判斷已經由上面
         * 那一次附條件更新做完了），因此它自己再被誰改一次也不會產生錯誤的寫入。
         */
        const current = await tx.overtimeRequest.findFirst({
          where: {
            id: params.requestId,
            accountBookId: params.accountBookId,
          },
          select: { status: true, isEmergency: true },
        });
        const reclassified =
          current !== null &&
          current.status === OvertimeRequestStatus.PENDING &&
          current.isEmergency !== params.isEmergencyAtDerivation;
        return {
          outcome: reclassified
            ? OvertimeDecisionOutcome.RECLASSIFIED
            : OvertimeDecisionOutcome.ALREADY_REVIEWED,
          grantCount: 0,
          cashOutEventIds: [],
        };
      }

      const cashOutEventIds: string[] = [];
      let grantCount = 0;

      for (const segment of params.segments) {
        const stored = await tx.overtimeSegment.create({
          data: {
            overtimeRequestId: params.requestId,
            order: segment.order,
            tier: segment.tier,
            minutes: segment.minutes,
            engineVersion: params.engineVersion,
          },
          select: { id: true },
        });

        if (params.compensatory !== null) {
          const { leavePolicyId, dayEquivalentMinutes, expiresOn } =
            params.compensatory;
          const grantedDays = deriveCompensatoryGrantDays({
            minutes: segment.minutes,
            dayEquivalentMinutes,
          });

          /**
           * Info: (20260818 - Julian) 1:1 由 `assertGrantSource` 把關（§32-1）。
           * 這裡把分段分鐘一併傳進去 —— 不傳它就驗不了 1:1，
           * 而驗不了的時候不變式會直接拒絕，不會默默放行。
           */
          assertGrantSource({
            source: LeaveGrantSource.OVERTIME_CONVERSION,
            grantedDays,
            dayEquivalentMinutes,
            grantedMinutes: segment.minutes,
            cycleStartDate: params.workDate,
            cycleEndDate: params.workDate,
            expiresOn,
            overtimeSegmentId: stored.id,
            overtimeSegmentMinutes: segment.minutes,
            reason: null,
          });

          const grant = await tx.leaveGrant.create({
            data: {
              accountBookId: params.accountBookId,
              employeeId: params.employeeId,
              leavePolicyId,
              source: LeaveGrantSource.OVERTIME_CONVERSION,
              // Info: (20260818 - Julian) Decimal 以字串落地（邊界防護，CLAUDE.md §2）
              grantedDays: String(grantedDays),
              dayEquivalentMinutes,
              grantedMinutes: segment.minutes,
              /**
               * Info: (20260818 - Julian) 補休的「週期」就是加班那一天本身。
               * 它不像特休有年度週期 —— 額度來自一次事件，而 `expiresOn`
               * 依帳本協商的期限往後推（§32-1）。
               */
              cycleStartDate: params.workDate,
              cycleEndDate: params.workDate,
              expiresOn,
              overtimeSegmentId: stored.id,
            },
            select: { id: true },
          });

          await tx.leaveLedgerEntry.create({
            data: {
              leaveGrantId: grant.id,
              entryType: LeaveLedgerEntryType.GRANT,
              deltaMinutes: segment.minutes,
              grantBalanceAfterMinutes: segment.minutes,
              actorEmployeeId: params.actorEmployeeId,
              idempotencyKey: buildOvertimeGrantIdempotencyKey(stored.id),
            },
          });
          grantCount += 1;
          continue;
        }

        if (params.cashOut !== null) {
          /**
           * Info: (20260818 - Julian) 一段一筆折現事件。
           *
           * `LeaveCashOutEvent` 只有單一 `premiumTier` 與單一 `minutes` ——
           * 把三小時併成一筆就說不出「哪兩小時是 1/3、哪一小時是 2/3」，
           * 而薪資模組要的正是那個切分（ADR 024 §5.2、§7）。
           * **事件沒有金額欄位**：本模組不算錢。
           */
          const event = await tx.leaveCashOutEvent.create({
            data: {
              accountBookId: params.accountBookId,
              employeeId: params.employeeId,
              reason: LeaveCashOutReason.OVERTIME_PAYMENT,
              minutes: segment.minutes,
              premiumTier: segment.tier,
              grantDayEquivalentMinutes: params.cashOut.dayEquivalentMinutes,
              cashOutDayEquivalentMinutes: params.cashOut.dayEquivalentMinutes,
              // Info: (20260818 - Julian) 加班費的折現不來自任何額度批次
              sourceGrantIds: [],
              legalBasis: params.cashOut.legalBasis,
            },
            select: { id: true },
          });
          cashOutEventIds.push(event.id);
        }
      }

      /**
       * Info: (20260818 - Julian) 餘額快取與帳本同交易更新（ADR 022 §4 第一條規矩）。
       * 一次寫完所有分段之後才算，而不是每段各算一次 —— 中間值沒有人會讀到，
       * 多算幾次只是多幾次全表加總。
       */
      if (grantCount > 0 && params.compensatory !== null) {
        const scope = {
          accountBookId: params.accountBookId,
          employeeId: params.employeeId,
          leavePolicyId: params.compensatory.leavePolicyId,
        };
        await writeBalance(tx, {
          ...scope,
          remainingMinutes: await sumLedgerMinutes(tx, scope),
        });
      }

      return {
        outcome: OvertimeDecisionOutcome.DECIDED,
        grantCount,
        cashOutEventIds,
      };
    });
  }

  public async withdraw(params: {
    accountBookId: string;
    requestId: string;
    withdrawnAt: Date;
    withdrawReason: string | null;
  }): Promise<OvertimeDecisionOutcome> {
    /**
     * Info: (20260818 - Julian) `status: PENDING` 是更新條件本身，不是先查再寫。
     *
     * 申請人在手機上按撤回、主管同一刻在電腦上按核准 —— 先讀再寫會兩邊都通過，
     * 於是一張單同時是「已撤回」與「已核准」，而補休批次已經入帳了
     * （同 `approve` 與 `reject` 的既有處置）。
     */
    const moved = await prisma.overtimeRequest.updateMany({
      where: {
        id: params.requestId,
        accountBookId: params.accountBookId,
        status: OvertimeRequestStatus.PENDING,
      },
      data: {
        status: OvertimeRequestStatus.WITHDRAWN,
        withdrawnAt: params.withdrawnAt,
        withdrawReason: params.withdrawReason,
      },
    });
    return moved.count === 0
      ? OvertimeDecisionOutcome.ALREADY_REVIEWED
      : OvertimeDecisionOutcome.DECIDED;
  }

  public async declareEmergency(params: {
    accountBookId: string;
    requestId: string;
    emergencyReportUrl: string;
    emergencyReportedAt: Date;
    emergencyDeclaredByEmployeeId: string;
  }): Promise<OvertimeDecisionOutcome> {
    /**
     * Info: (20260819 - Julian) 不變式在寫入前先擋一次。
     * 這裡的參數必然通過（三者都是必填），但把它寫出來是為了讓
     * 「認定的每一條寫入路徑都經過同一個判準」這句話在程式裡是真的 ——
     * 而不是靠讀者去比對三支方法的參數型別。
     */
    assertOvertimeEmergencyRecord({
      isEmergency: true,
      emergencyReportUrl: params.emergencyReportUrl,
      emergencyReportedAt: params.emergencyReportedAt,
      emergencyDeclaredByEmployeeId: params.emergencyDeclaredByEmployeeId,
    });
    assertEmergencyDeclaration({
      reportUrl: params.emergencyReportUrl,
      reportedAt: params.emergencyReportedAt,
      declaredByEmployeeId: params.emergencyDeclaredByEmployeeId,
      revokedAt: null,
      revokedByEmployeeId: null,
      revokeReason: null,
    });

    return prisma.$transaction(async (tx) => {
      const moved = await tx.overtimeRequest.updateMany({
        where: {
          id: params.requestId,
          accountBookId: params.accountBookId,
          status: OvertimeRequestStatus.PENDING,
          /**
           * Info: (20260820 - Julian) **只認定得了一次**（review 第 3 輪第 2 條）。
           *
           * 原本條件只有 `status`，於是第二次認定會靜默蓋掉連結、時點與
           * 認定者，並回 `DECIDED` —— 呼叫端看到的與成功的第一次一模一樣，
           * 而前一份報備紀錄從此沒有任何資料說得出來。
           *
           * 這一行同時是「一張單最多一份有效認定」的執行者：歷史表沒有
           * partial unique index（Prisma schema 表達不出來），約束在這裡。
           */
          isEmergency: false,
        },
        data: {
          isEmergency: true,
          emergencyReportUrl: params.emergencyReportUrl,
          emergencyReportedAt: params.emergencyReportedAt,
          emergencyDeclaredByEmployeeId: params.emergencyDeclaredByEmployeeId,
        },
      });
      if (moved.count === 0) {
        /**
         * Info: (20260820 - Julian) 兩種落空要分得出來：已決行 vs 已經認定過。
         * 回同一句話的話，HR 會以為是別人先決行了，而實際上是他自己
         * （或另一位人資）已經認定過一次，那時該做的是先撤回再重新認定。
         */
        const current = await tx.overtimeRequest.findFirst({
          where: {
            id: params.requestId,
            accountBookId: params.accountBookId,
          },
          select: { status: true, isEmergency: true },
        });
        return current !== null &&
          current.status === OvertimeRequestStatus.PENDING &&
          current.isEmergency
          ? OvertimeDecisionOutcome.ALREADY_DECLARED
          : OvertimeDecisionOutcome.ALREADY_REVIEWED;
      }

      /**
       * Info: (20260820 - Julian) 歷史列與旗標同一筆交易（review 第 3 輪第 2 條）。
       *
       * 分開寫的話會出現「旗標翻了、歷史沒有」或反過來 —— 前者讓加倍發給
       * 沒有可追查的來源，後者讓勞動檢查看到一份不對應任何加班單的報備。
       */
      await tx.overtimeEmergencyDeclaration.create({
        data: {
          accountBookId: params.accountBookId,
          overtimeRequestId: params.requestId,
          reportUrl: params.emergencyReportUrl,
          reportedAt: params.emergencyReportedAt,
          declaredByEmployeeId: params.emergencyDeclaredByEmployeeId,
        },
      });

      return OvertimeDecisionOutcome.DECIDED;
    });
  }

  public async revokeEmergency(params: {
    accountBookId: string;
    requestId: string;
    revokedByEmployeeId: string;
    revokedAt: Date;
    revokeReason: string;
  }): Promise<OvertimeDecisionOutcome> {
    return prisma.$transaction(async (tx) => {
      const moved = await tx.overtimeRequest.updateMany({
        where: {
          id: params.requestId,
          accountBookId: params.accountBookId,
          status: OvertimeRequestStatus.PENDING,
          // Info: (20260820 - Julian) 撤回一份不存在的認定不是成功，是落空
          isEmergency: true,
        },
        /**
         * Info: (20260820 - Julian) 三欄一起清空 —— `assertOvertimeEmergencyRecord`
         * 的反方向要求「沒有 `isEmergency` 就不得帶記載」。
         *
         * 這不是刪掉那份紀錄：它整份留在 `OvertimeEmergencyDeclaration` 裡，
         * 連同撤回的時點、撤回者與理由。這裡清掉的是**現況**欄位，
         * 而現況是「這張單目前不是天災事變」。
         */
        data: {
          isEmergency: false,
          emergencyReportUrl: null,
          emergencyReportedAt: null,
          emergencyDeclaredByEmployeeId: null,
        },
      });
      if (moved.count === 0) {
        const current = await tx.overtimeRequest.findFirst({
          where: {
            id: params.requestId,
            accountBookId: params.accountBookId,
          },
          select: { status: true, isEmergency: true },
        });
        return current !== null &&
          current.status === OvertimeRequestStatus.PENDING &&
          !current.isEmergency
          ? OvertimeDecisionOutcome.NOT_DECLARED
          : OvertimeDecisionOutcome.ALREADY_REVIEWED;
      }

      /**
       * Info: (20260820 - Julian) 補在**還沒被撤回的那一列**上（`revokedAt: null`）。
       *
       * 不用 `findFirst` 再 `update`：那是先讀再寫，而附條件的 `updateMany`
       * 在同一句話裡完成（同本檔其餘狀態轉移的既有處置）。
       * 上面那次更新已經保證此刻恰有一份有效認定。
       */
      await tx.overtimeEmergencyDeclaration.updateMany({
        where: {
          overtimeRequestId: params.requestId,
          accountBookId: params.accountBookId,
          revokedAt: null,
        },
        data: {
          revokedAt: params.revokedAt,
          revokedByEmployeeId: params.revokedByEmployeeId,
          revokeReason: params.revokeReason,
        },
      });

      return OvertimeDecisionOutcome.DECIDED;
    });
  }

  public async reject(params: {
    accountBookId: string;
    requestId: string;
  }): Promise<OvertimeDecisionOutcome> {
    const moved = await prisma.overtimeRequest.updateMany({
      where: {
        id: params.requestId,
        accountBookId: params.accountBookId,
        status: OvertimeRequestStatus.PENDING,
      },
      data: { status: OvertimeRequestStatus.REJECTED },
    });
    return moved.count === 0
      ? OvertimeDecisionOutcome.ALREADY_REVIEWED
      : OvertimeDecisionOutcome.DECIDED;
  }
}

export const overtimeRequestRepo: IOvertimeRequestRepository =
  new OvertimeRequestRepository();
