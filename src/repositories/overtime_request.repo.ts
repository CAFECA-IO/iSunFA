import { prisma } from "@/lib/prisma";
import {
  LeaveCashOutReason,
  LeaveGrantSource,
  LeaveLedgerEntryType,
} from "@/constants/leave_policy";
import {
  buildOvertimeGrantIdempotencyKey,
  buildOvertimeRevokeIdempotencyKey,
  OVERTIME_APPROVAL_REVOKED_REASON,
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
import { ledgerActorOf } from "@/repositories/leave_ledger";
import { assertGrantSource } from "@/repositories/leave_grant_invariant";
import {
  assertEmergencyDeclaration,
  assertOvertimeEmergencyRecord,
  assertOvertimeFilingType,
  assertOvertimeSegmentPremium,
  IStorableOvertimeRequest,
  OvertimeRequestInvariantError,
} from "@/repositories/overtime_request_invariant";

/**
 * Info: (20260821 - Julian) 核准的後果已經不可逆（review 第 7 輪 B1）。
 *
 * 補休批次已被請掉／過期／折現，或折現事件已由薪資模組結算。
 * 不是 `AppError`：它由 service 轉成 4xx 與一句說得出下一步的文案
 * （同 `OvertimeRequestInvariantError` 的處置）。
 */
export class OvertimeApprovalNotReversibleError extends Error {
  public readonly requestId: string;

  public constructor(requestId: string, detail: string) {
    super(
      `the approval of overtime request ${requestId} can no longer be reversed: ${detail}`,
    );
    this.name = "OvertimeApprovalNotReversibleError";
    this.requestId = requestId;
  }
}

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
   * Info: (20260821 - Julian) 撤銷核准：`APPROVED → PENDING`（review 第 7 輪 B1）。
   *
   * 在它之前 `APPROVED` 是終端狀態 —— 五個 `updateMany` 全部
   * `where.status = PENDING`。而 `VA_OVERTIME_EARLIER_THAN_APPROVED`
   * 的文案叫使用者「撤回較晚那張、兩張一起重送」，一句沒有執行者的補救。
   *
   * 補休已被使用或折現已被薪資結算時丟 `OvertimeApprovalNotReversibleError`
   * —— 那不是「再試一次」，是一個終局的事實。
   */
  revokeApproval(params: {
    accountBookId: string;
    requestId: string;
    revokedByEmployeeId: string;
    revokedAt: Date;
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
        /**
         * Info: (20260820 - Julian) 重新分類要分得出**方向**（review 第 4 輪第 3 條）。
         *
         * `!==` 對稱，兩個方向都會落在這裡：人資中途認定（false → true，
         * 工資加倍），或人資中途撤回（true → false，工資降回普通級距）。
         * 回同一個結局的話，呼叫端只講得出其中一個方向，而另一個方向的
         * 主管會讀到一句與事實相反的說明。方向就在手上（`current.isEmergency`），
         * 不需要多一次查詢 —— 少傳它才是刻意把已知的事實丟掉。
         */
        return {
          outcome: reclassified
            ? current.isEmergency
              ? OvertimeDecisionOutcome.RECLASSIFIED_TO_EMERGENCY
              : OvertimeDecisionOutcome.RECLASSIFIED_TO_ORDINARY
            : OvertimeDecisionOutcome.ALREADY_REVIEWED,
          grantCount: 0,
          cashOutEventIds: [],
        };
      }

      const cashOutEventIds: string[] = [];
      let grantCount = 0;
      /**
       * Info: (20260820 - Julian) 操作者查一次，且在**任何寫入之前**
       * （review 第 6 輪 M16）。
       *
       * 第一版展開在每一筆分錄的 `data` 裡，於是它排在
       * `overtimeSegment.create` 與 `leaveGrant.create` **之後** ——
       * 操作者不屬於這個帳本時，例外會在已經寫進一段分段與一筆補休批次
       * 之後才丟。正式環境靠交易回滾收拾，但「先寫再檢查」的順序
       * 不該靠回滾才正確。
       *
       * 只有補休折換會寫帳本（折現寫的是 `LeaveCashOutEvent`，沒有操作者欄位），
       * 因此**發錢的單子不查這一次** —— 那是最常見的路徑，替它多打一次
       * 查詢只為了一個不會用到的值。
       */
      const actor =
        params.compensatory === null ? null : await ledgerActorOf(tx, params);

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
          /**
           * Info: (20260820 - Julian) 走到這裡 `actor` 必然非 null（它與
           * `params.compensatory` 由同一個條件決定），但用 `?? {}` 帶過會讓
           * 那個「必然」在型別上消失 —— 而它一旦不成立，症狀是一筆**查不出
           * 操作者的補休入帳**，沒有任何錯誤訊息。寧可在這裡大聲壞掉。
           */
          if (actor === null) {
            throw new OvertimeRequestInvariantError(
              "a compensatory conversion reached the ledger without a resolved actor",
              `requestId=${params.requestId}`,
            );
          }

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
              // Info: (20260820 - Julian) 操作者三欄一起落地（review 第 6 輪 M16）
              ...actor,
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
              /**
               * Info: (20260821 - Julian) 但它來自**這一段**（review 第 7 輪 B1）。
               * 少了這一欄，撤銷核准找不到要回收的事件，勞檢問「這筆加班費
               * 對應哪一段核准」也答不出來。
               */
              overtimeSegmentId: stored.id,
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

  /**
   * Info: (20260821 - Julian) 撤銷核准：`APPROVED → PENDING`（review 第 7 輪 B1）。
   *
   * ## 為什麼非有不可
   *
   * `VA_OVERTIME_EARLIER_THAN_APPROVED` 的錯誤訊息與五個語系的文案都寫著
   * 「撤回較晚那張、兩張一起重送」，而在這一支之前**那個動作做不到**：
   * `OvertimeRequest` 的五個 `updateMany` 全部 `where.status = PENDING`，
   * `APPROVED` 是終端狀態，`withdraw` 對它丟 `VA_OVERTIME_ALREADY_REVIEWED`。
   * 於是那張較早的單永久送不出去 —— 一段真實工時整段不存在於系統裡，
   * 從「級距算錯、少付 40」變成「工時消失、少付 80」。
   *
   * **一句沒有執行者的補救比沒有補救更糟**：它會讓讀訊息的人以為有路可走。
   *
   * ## 要還原的四樣東西
   *
   * `approve` 在同一個交易裡寫下：分段、（補休）額度批次與 GRANT 分錄、
   * （發錢）折現事件、以及餘額快取。這裡逐一還原，順序由外鍵決定 ——
   * 分錄 → 批次 → 折現事件 → 分段（`LeaveGrant.overtimeSegment` 與
   * `LeaveCashOutEvent.overtimeSegment` 都是 `onDelete: Restrict`）。
   *
   * ## 不可逆的邊界，由**資料庫**擋，不是由這裡的檢查擋
   *
   * 補休批次一旦被請掉／過期／折現，它就有了 `GRANT` 以外的分錄；
   * 而 `LeaveLedgerEntry.leaveGrant` 是 `onDelete: Restrict`，
   * 所以「刪得掉批次」與「這批補休沒有被動過」是**同一件事**。
   * 下面那次預檢只是為了給出一句說得出下一步的訊息 ——
   * 真正的保證是外鍵，它擋得住預檢與刪除之間才發生的那一次扣減。
   *
   * 折現事件則看 `settledAt`：薪資模組結算過就不能撤，
   * 那筆錢已經發出去了。
   *
   * ## 為什麼先 claim 再檢查
   *
   * 與 `approve` 的「參數驗證要在寫入之前」不同 —— 這裡的前提**只能從
   * 資料庫讀出來**，不是呼叫端交出來的東西。因此先用附條件更新 claim
   * 住 `APPROVED`（擋掉並行的第二次撤銷），再驗證、不通過就丟例外讓
   * 交易整個回滾。回滾在這裡是機制，不是替草率順序收拾的網子。
   */
  public async revokeApproval(params: {
    accountBookId: string;
    requestId: string;
    /** Info: (20260821 - Julian) 撤銷者與時點一起落地 —— 撤銷本身也要留痕 */
    revokedByEmployeeId: string;
    revokedAt: Date;
  }): Promise<OvertimeDecisionOutcome> {
    return prisma.$transaction(async (tx) => {
      const moved = await tx.overtimeRequest.updateMany({
        where: {
          id: params.requestId,
          accountBookId: params.accountBookId,
          status: OvertimeRequestStatus.APPROVED,
        },
        data: {
          status: OvertimeRequestStatus.PENDING,
          /**
           * Info: (20260821 - Julian) 三欄一起清掉。
           *
           * `assertOvertimeFilingType` 要求「非 APPROVED 的單不得帶著核准
           * 與認列分鐘」—— 留著它們的話，一張回到待簽的單看起來像曾經被
           * 核准過，而 L28 的統計會把它算進去。`evidenceBasis` 回到送出時
           * 的預設：認列基準要等下一次核准當下才知道。
           */
          approvedMinutes: null,
          recognizedMinutes: null,
          evidenceBasis: OvertimeEvidenceBasis.PUNCH_RECORD,
          /**
           * Info: (20260821 - Julian) 稽核三欄寫在**同一個 `data`** 裡
           * （review 第 8 輪第 1 條）。
           *
           * 不另外 `update` 一次：撤銷的事實與狀態轉移必須是同一個原子動作，
           * 否則會有一個「已經回到 PENDING、但查不出是誰撤的」的中間狀態。
           * `approvalRevokeCount` 的遞增也在這裡 —— 下面反向分錄的冪等鍵
           * 要用它，兩者同生共死。
           */
          approvalRevokedAt: params.revokedAt,
          approvalRevokedByEmployeeId: params.revokedByEmployeeId,
          approvalRevokeCount: { increment: 1 },
        },
      });
      if (moved.count === 0) return OvertimeDecisionOutcome.NOT_APPROVED;

      /**
       * Info: (20260821 - Julian) 把遞增後的次數讀回來當冪等鍵的一部分。
       * 讀在 claim **之後**：claim 成功就代表這一次撤銷是我們的，
       * 此刻讀到的次數不會再被別人改（同一交易內）。
       */
      const claimed = await tx.overtimeRequest.findFirst({
        where: { id: params.requestId, accountBookId: params.accountBookId },
        select: { approvalRevokeCount: true, compensationMode: true },
      });
      const revokeCount = claimed?.approvalRevokeCount ?? 1;
      const isPayment =
        claimed?.compensationMode === OvertimeCompensationMode.PAYMENT;

      /**
       * Info: (20260821 - Julian) 只找**現役**分段（`revokedAt: null`）。
       * 少了這個條件，第二次撤銷會把前一次已經標記過的那組再算一次，
       * 於是「折現事件數 == 分段數」那條不變式必定對不上。
       */
      const segments = await tx.overtimeSegment.findMany({
        where: { overtimeRequestId: params.requestId, revokedAt: null },
        select: { id: true },
      });
      const segmentIds = segments.map((segment) => segment.id);

      const grants = await tx.leaveGrant.findMany({
        where: { overtimeSegmentId: { in: segmentIds }, revokedAt: null },
        select: {
          id: true,
          employeeId: true,
          leavePolicyId: true,
          grantedMinutes: true,
          overtimeSegmentId: true,
        },
      });
      const grantIds = grants.map((grant) => grant.id);

      /**
       * Info: (20260821 - Julian) 預檢：這批補休有沒有被動過。
       * 只為了錯誤訊息 —— 真正的保證是下面 `leaveGrant.deleteMany` 撞上的外鍵。
       */
      const touched = await tx.leaveLedgerEntry.count({
        where: {
          leaveGrantId: { in: grantIds },
          entryType: { not: LeaveLedgerEntryType.GRANT },
        },
      });
      if (touched > 0) {
        throw new OvertimeApprovalNotReversibleError(
          params.requestId,
          `${touched} ledger entries other than GRANT already exist on the compensatory grants`,
        );
      }

      /**
       * Info: (20260821 - Julian) 折現事件必須**逐段對得起來**（review 第 8 輪第 2 條）。
       *
       * `approve` 對 `PAYMENT` 單是一段一筆事件，所以「連結到這些分段的事件數」
       * 必須等於分段數。對不上只有一種成因：那些事件是
       * `leave_cash_out_event.overtime_segment_id` 這一欄上線**之前**建立的，
       * `overtime_segment_id IS NULL` —— 而 PostgreSQL 的 unique **不約束 NULL**。
       *
       * 若放行，兩件事會同時發生：
       *
       * 1. 刪不到那筆舊事件 → 留下一筆描述「系統現在說從未被核准」那段工時的
       *    折現事件，薪資模組落地後會照它發錢。
       * 2. 重新核准時 `resolveCashOut` 在 `PAYMENT` + 有分段時必定非 null，
       *    為每個新分段各建一筆 —— **同一段 120 分鐘存在兩筆事件，付兩次**。
       *
       * 因此對不上就丟。`VA_OVERTIME_APPROVAL_NOT_REVERSIBLE` 的文案
       * 「找人資做人工調整」剛好就是正確的下一步。
       */
      const linkedCashOuts = await tx.leaveCashOutEvent.count({
        where: { overtimeSegmentId: { in: segmentIds } },
      });
      /**
       * Info: (20260821 - Julian) 判準直接讀 `compensationMode`，不從
       * 「有沒有補休批次」反推 —— 反推在「批次已被前一次撤銷標記掉」時會給錯答案。
       */
      const expectedCashOuts = isPayment ? segmentIds.length : 0;
      if (linkedCashOuts !== expectedCashOuts) {
        throw new OvertimeApprovalNotReversibleError(
          params.requestId,
          `expected ${expectedCashOuts} linked cash-out events for this ${claimed?.compensationMode} request with ${segmentIds.length} segments, found ${linkedCashOuts}; the difference predates leave_cash_out_event.overtime_segment_id`,
        );
      }

      /**
       * Info: (20260821 - Julian) **帳本寫反向分錄，批次只標記** —— 都不刪
       * （ADR 022 §2.1／§2.4，review 第 8 輪第 1 條）。
       *
       * 第一版是 `leaveLedgerEntry.deleteMany` + `leaveGrant.deleteMany`，
       * 而 ADR 022 §2.1 的原話是 `LeaveLedgerEntry`「永不 update、永不 delete」、
       * `LeaveGrant`「不可變」，§2.4 是「撤銷是寫反向分錄，不是刪列」。
       * 同一張加班單上的 §32 IV 認定早就照做了（`OvertimeEmergencyDeclaration`
       * 的註解寫著「兩者都不刪」）—— 硬刪讓同一張單的兩種撤銷稽核強度不一樣，
       * 而被刪掉的那一側是**進過員工餘額**的那一側。
       *
       * 反向分錄的三個要點：
       * - `deltaMinutes` 是負的授予量，`grantBalanceAfterMinutes` 因此為 0。
       * - `entryType` 用 `ADJUST`：`RESTORE` 的語意是「銷假把額度還回來」，
       *   方向相反，混用會讓 L10 的帳本畫面說錯故事。
       * - `idempotencyKey` 含撤銷次數，否則第二次撤銷會撞唯一鍵被當成重放。
       */
      for (const grant of grants) {
        await tx.leaveLedgerEntry.create({
          data: {
            leaveGrantId: grant.id,
            entryType: LeaveLedgerEntryType.ADJUST,
            deltaMinutes: -grant.grantedMinutes,
            grantBalanceAfterMinutes: 0,
            actorEmployeeId: params.revokedByEmployeeId,
            reason: OVERTIME_APPROVAL_REVOKED_REASON,
            idempotencyKey: buildOvertimeRevokeIdempotencyKey(
              grant.overtimeSegmentId ?? grant.id,
              revokeCount,
            ),
          },
        });
      }

      await tx.leaveGrant.updateMany({
        where: { id: { in: grantIds } },
        data: { revokedAt: params.revokedAt },
      });

      /**
       * Info: (20260821 - Julian) 折現事件的刪除**帶上 `settledAt: null`**
       * （review 第 8 輪第 3 條）。
       *
       * 上面那次 `count` 是先查後改，而折現這一側**沒有外鍵當後盾**
       * （補休那一側有：`LeaveLedgerEntry.leaveGrant` 是 `onDelete: Restrict`）。
       * READ COMMITTED 下的順序可以是：`count` 讀到 null → 薪資模組 commit
       * `settled_at` → `deleteMany` 看得到那個新 commit 並**照樣刪掉**，
       * 全程無衝突、沒有東西會觸發回滾。
       *
       * 條件式刪除 + 比對筆數之後，「已結算不准撤」與「刪得掉」變成同一件事，
       * 兩側的保護強度也就不必再解釋為什麼不同。
       */
      const removed = await tx.leaveCashOutEvent.deleteMany({
        where: { overtimeSegmentId: { in: segmentIds }, settledAt: null },
      });
      if (removed.count !== linkedCashOuts) {
        throw new OvertimeApprovalNotReversibleError(
          params.requestId,
          `${linkedCashOuts - removed.count} cash-out events were settled by payroll while this revocation was running`,
        );
      }

      /**
       * Info: (20260821 - Julian) 分段也**只標記，不刪**（review 第 9 輪 B1）。
       *
       * 第一版是 `deleteMany`，而它在補休那條路上**必定 500**：
       * `LeaveGrant.overtimeSegment` 是 `onDelete: Restrict`，而上面剛把批次
       * 改成標記 `revokedAt`（ADR 022 §2.1）—— 批次還活著、`overtimeSegmentId`
       * 還指著這一列，刪父列就是 P2003，而 P2003 不是 `AppError`，
       * route 會把它收斂成 `IS_DB_FAILED`（500）。
       *
       * `revokeSeq` 一併寫成這一次的撤銷次數：現役世代恆為 0，
       * 撤銷過的是 1, 2, 3…，`@@unique([overtimeRequestId, order, revokeSeq])`
       * 因此讓重新核准寫得回 `order = 0`。
       *
       * 這也讓 `engineVersion` 的原意（「舊資料仍能說明它當初依哪一版算出來」）
       * 對**被撤銷的**那組分段一起成立 —— 而那是加班費算過多少錢的唯一憑據。
       */
      await tx.overtimeSegment.updateMany({
        where: { overtimeRequestId: params.requestId, revokedAt: null },
        data: { revokedAt: params.revokedAt, revokeSeq: revokeCount },
      });

      /**
       * Info: (20260821 - Julian) 餘額快取與帳本同交易更新（ADR 022 §4 第一條規矩）。
       * 依 `(employeeId, leavePolicyId)` 去重之後各重算一次 —— 一張單的分段
       * 全部落在同一個假別上，但去重讓這件事不必是前提。
       */
      const scopes = new Map<
        string,
        { accountBookId: string; employeeId: string; leavePolicyId: string }
      >();
      for (const grant of grants) {
        scopes.set(`${grant.employeeId}/${grant.leavePolicyId}`, {
          accountBookId: params.accountBookId,
          employeeId: grant.employeeId,
          leavePolicyId: grant.leavePolicyId,
        });
      }
      for (const scope of scopes.values()) {
        const remainingMinutes = await sumLedgerMinutes(tx, scope);
        /**
         * Info: (20260821 - Julian) **撤銷之後餘額不得為負** —— 這是那次預檢
         * 唯一真正的後盾（review 第 9 輪 B1）。
         *
         * 上面 `touched` 那次 `count` 是先查後改。第 8 輪的註解說「真正的保證
         * 是外鍵」，而那句話在**批次改成不刪之後就過期了**：
         * `LeaveLedgerEntry.leaveGrant` 的 `onDelete: Restrict` 永遠不會被觸發，
         * 因為沒有人再刪批次。
         *
         * 剩下的保護在這裡，而且它是**結果導向**的：預檢與寫入之間若插進一筆
         * 扣減，那批的分錄會變成 `+120 −120 −60 = −60`，而一個負的餘額在
         * ADR 022 的模型裡不可能是對的（FIFO 只扣得動有餘額的批次）。
         * 丟出去讓整筆交易回滾 —— 競態因此有了偵測器，不再只有一句宣稱。
         */
        if (remainingMinutes < 0) {
          throw new OvertimeApprovalNotReversibleError(
            params.requestId,
            `reversing this approval would leave ${remainingMinutes} minutes on policy ${scope.leavePolicyId}; the compensatory leave was consumed while this revocation was running`,
          );
        }
        await writeBalance(tx, { ...scope, remainingMinutes });
      }

      return OvertimeDecisionOutcome.DECIDED;
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
       * Info: (20260820 - Julian) 撤回也要過同一道判準（review 第 4 輪第 4 條）。
       *
       * `assertEmergencyDeclaration` 原本只有 `declareEmergency` 一個呼叫端，
       * 而它傳的撤回三欄是三個字面 `null` —— 於是那支不變式**在它被寫來守的
       * 那條路徑上一個呼叫端都沒有**，schema 註解卻寫著「由
       * `assertEmergencyDeclaration` 雙向擋」。測試直接呼叫函式本身，
       * 所以永遠是綠的（§1.7）。
       *
       * 讀一次有效認定，把撤回三欄合上去再擋，是唯一能讓那句註解成立的做法：
       * 判準要看得到完整的一列（連結、時點、認定者 ＋ 撤回三欄），
       * 而撤回的呼叫端手上只有後三欄。
       *
       * 這一讀不影響是否寫入 —— 上面那次附條件更新已經做完判斷。
       * 它只提供擋下來所需要的另外三個欄位；擋下來時整個交易回滾，
       * 旗標那次更新一併撤銷，不會留下「旗標翻了、歷史沒有」的半套狀態。
       */
      const active = await tx.overtimeEmergencyDeclaration.findFirst({
        where: {
          overtimeRequestId: params.requestId,
          accountBookId: params.accountBookId,
          revokedAt: null,
        },
        select: {
          reportUrl: true,
          reportedAt: true,
          declaredByEmployeeId: true,
        },
      });
      if (active === null) {
        /**
         * Info: (20260820 - Julian) 旗標說「認定中」，歷史表卻沒有那一列。
         *
         * 這是資料層面的破口，不是使用者做錯了什麼：走得到這裡表示上面那次
         * `where: { isEmergency: true }` 命中了。放行的話會撤回一份沒有任何
         * 痕跡的認定 —— 勞動檢查時既看不到報備、也看不到撤回。
         *
         * 已知成因只有一個：歷史表加進來（本 PR）之前就存在的
         * `isEmergency = true` 舊列。正式環境沒有這種列（部署檢查表已納入），
         * 開發機若撞到，處置是把那張單的 `isEmergency` 改回 false 再重新認定。
         */
        throw new OvertimeRequestInvariantError(
          "an emergency determination that is in force must have left a history row; revoking one that has none would erase a filing that was made to the outside world",
          `overtimeRequestId=${params.requestId}`,
        );
      }
      assertEmergencyDeclaration({
        reportUrl: active.reportUrl,
        reportedAt: active.reportedAt,
        declaredByEmployeeId: active.declaredByEmployeeId,
        revokedAt: params.revokedAt,
        revokedByEmployeeId: params.revokedByEmployeeId,
        revokeReason: params.revokeReason,
      });

      /**
       * Info: (20260820 - Julian) 補在**還沒被撤回的那一列**上（`revokedAt: null`）。
       *
       * 用附條件的 `updateMany` 而不是拿上面那次 `findFirst` 的 id 去 `update`：
       * 條件要在寫入的同一句話裡（同本檔其餘狀態轉移的既有處置）。
       * 旗標那次更新已經保證此刻恰有一份有效認定。
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
