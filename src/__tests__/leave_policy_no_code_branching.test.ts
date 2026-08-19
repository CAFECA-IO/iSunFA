import { describe, it, expect } from "@jest/globals";
import { readdirSync, readFileSync } from "fs";
import { join, relative } from "path";
import ts from "typescript";
import { LEAVE_POLICY_CODE } from "@/constants/leave_policy";

/**
 * Info: (20260819 - Julian) T19：規則引擎不得對 `LeavePolicy.code` 做分支（ADR 021 §2.1）。
 *
 * ## 這條紅線守的是什麼
 *
 * ADR 021 把「假別」從 `enum LeaveType` 換成一張可設定的 `LeavePolicy` 表。
 * 那個決定的全部價值建立在一件事上：**引擎只讀屬性，不讀身分**。
 * 一旦有人寫下 `if (policy.code === "ANNUAL")`，租戶自訂的假別就會靜默掉進
 * 一段沒有為它們寫過的分支 —— 而症狀不是報錯，是那個假別的規則悄悄變成
 * 另一個假別的規則。「可設定」於是只剩下畫面上的一個表單。
 *
 * ADR 021:179 寫著：這支測試「**必須在里程碑 1 就存在**，不能等到有人違反。
 * **牆要在人進來之前蓋好。**」
 *
 * ## 它先前不存在（review B8）
 *
 * 而 `src/constants/leave_policy.ts`、`leave_policy.service.ts` 與假別設定的
 * route 有三處註解寫著「由 `leave_policy_no_code_branching.test.ts` 釘住」。
 * 牆沒有蓋，門牌先掛上去了 —— 讀到那三句的人會以為這件事有人守著。
 * 本檔補上那道牆，那三處註解同時改回實話。
 *
 * ## 為什麼用 TypeScript 的 AST 而不是正則
 *
 * 這些檔案的註解密度很高，而註解裡**必須**寫得出 `code`、`ANNUAL` 這些字
 * （上面這段就是）。正則掃描要先去註解，而去註解本身是一個會出錯的小剖析器
 * （`attendance_i18n_keys.test.ts` 的檔頭記著它踩過的那次：測試拿自己的
 * 檔頭註解當違規來源）。AST 根本看不到註解，這裡不必付那個代價。
 */

/**
 * Info: (20260819 - Julian) 掃描根 = 引擎與編排這兩層的假勤檔案（checklist §1.1）。
 *
 * **不含 `src/repositories/`**：那一層本來就要用 code 去把內建假別**查出來**
 * （`overtime_request_context.repo.ts` 依 `COMPENSATORY` 找補休假別）。
 * 查詢與分支是兩件事 —— 查詢是「把那一列拿出來」，分支是「因為它是那一列，
 * 所以規則不一樣」。前者不寫死規則，後者才是 ADR 021 要擋的。
 *
 * 也不含 `src/components/`：畫面依 code 決定顯示哪一個 i18n 字串是正當的
 * （`LEAVE_POLICY_I18N_KEY` 就是為此存在），查無對照時回退 `LeavePolicy.name`。
 */
const SCAN_ROOTS: readonly { dir: string; match: RegExp }[] = [
  { dir: join("src", "lib"), match: /^(leave|overtime)_.*\.ts$/ },
  { dir: join("src", "services"), match: /^(leave|overtime).*\.ts$/ },
];

const POLICY_CODES: readonly string[] = Object.values(LEAVE_POLICY_CODE);

/** Info: (20260819 - Julian) 讀到這些名字就當作「拿到了假別的身分」 */
const CODE_IDENTIFIERS: readonly string[] = [
  "code",
  "policyCode",
  "leavePolicyCode",
];

interface IViolation {
  file: string;
  line: number;
  kind: string;
  snippet: string;
}

const collectFiles = (): string[] => {
  const files: string[] = [];
  for (const root of SCAN_ROOTS) {
    const absolute = join(process.cwd(), root.dir);
    for (const name of readdirSync(absolute, { withFileTypes: true })) {
      if (!name.isFile()) continue;
      if (!root.match.test(name.name)) continue;
      files.push(join(absolute, name.name));
    }
  }
  return files.sort();
};

const isCodeAccess = (node: ts.Node): boolean => {
  if (ts.isPropertyAccessExpression(node)) {
    return CODE_IDENTIFIERS.includes(node.name.text);
  }
  if (ts.isIdentifier(node)) return CODE_IDENTIFIERS.includes(node.text);
  return false;
};

/** Info: (20260819 - Julian) `LEAVE_POLICY_CODE.ANNUAL` 這種取用 */
const isPolicyCodeMember = (node: ts.Node): boolean =>
  ts.isPropertyAccessExpression(node) &&
  ts.isIdentifier(node.expression) &&
  node.expression.text === "LEAVE_POLICY_CODE";

const literalTextOf = (node: ts.Node): string | null => {
  if (ts.isStringLiteral(node)) return node.text;
  if (ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  return null;
};

const scan = (filePath: string): IViolation[] => {
  const text = readFileSync(filePath, "utf8");
  const source = ts.createSourceFile(
    filePath,
    text,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const file = relative(process.cwd(), filePath);
  const found: IViolation[] = [];

  const at = (node: ts.Node): number =>
    source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;

  const push = (node: ts.Node, kind: string): void => {
    found.push({
      file,
      line: at(node),
      kind,
      snippet: node.getText(source).slice(0, 120).replace(/\s+/g, " "),
    });
  };

  const visit = (node: ts.Node): void => {
    /**
     * Info: (20260819 - Julian) ①「ANNUAL」這串字出現在值的位置。
     *
     * 型別位置放行（`type X = "ANNUAL"` 是宣告不是分支），
     * import 的模組路徑不可能等於這些值，不必特判。
     */
    const literal = literalTextOf(node);
    if (
      literal !== null &&
      POLICY_CODES.includes(literal) &&
      node.parent !== undefined &&
      !ts.isLiteralTypeNode(node.parent)
    ) {
      push(node, "假別代號的字串常值");
    }

    // Info: (20260819 - Julian) ② 引擎層取用 LEAVE_POLICY_CODE 的成員
    if (isPolicyCodeMember(node)) {
      push(node, "取用 LEAVE_POLICY_CODE 的成員");
    }

    // Info: (20260819 - Julian) ③ switch (policy.code)
    if (ts.isSwitchStatement(node) && isCodeAccess(node.expression)) {
      push(node.expression, "以假別代號做 switch");
    }

    /**
     * Info: (20260819 - Julian) ④ `policy.code === ...`。
     *
     * 右手邊是什麼都擋，不只是字串常值：比對一個從別處拿來的變數
     * 一樣是「因為它是哪一個假別，所以規則不一樣」。
     */
    if (
      ts.isBinaryExpression(node) &&
      (node.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken ||
        node.operatorToken.kind === ts.SyntaxKind.ExclamationEqualsEqualsToken ||
        node.operatorToken.kind === ts.SyntaxKind.EqualsEqualsToken ||
        node.operatorToken.kind === ts.SyntaxKind.ExclamationEqualsToken) &&
      (isCodeAccess(node.left) || isCodeAccess(node.right))
    ) {
      push(node, "以假別代號做等值比較");
    }

    ts.forEachChild(node, visit);
  };

  ts.forEachChild(source, visit);
  return found;
};

describe("T19：規則引擎不得對 LeavePolicy.code 分支（ADR 021 §2.1）", () => {
  const files = collectFiles();

  /**
   * Info: (20260819 - Julian) **掃描型測試的價值等於它的掃描根。**
   *
   * 一支掃到零個檔案的測試永遠是綠的，而它綠的時候看起來與真的守住了
   * 一模一樣。目錄改名、檔案搬家、`match` 寫錯，都會讓上面那支測試
   * 從「沒有違規」變成「沒有在看」—— 這一條把兩者分開。
   */
  it("掃描根確實掃到東西（否則下面那條永遠是綠的）", () => {
    expect(files.length).toBeGreaterThanOrEqual(10);
    const names = files.map((path) => relative(process.cwd(), path));
    expect(names).toContain(join("src", "lib", "leave_entitlement_rules.ts"));
    expect(names).toContain(join("src", "lib", "leave_approval_chain.ts"));
    expect(names).toContain(join("src", "services", "leave_request.service.ts"));
    expect(names).toContain(join("src", "lib", "overtime_rules.ts"));
  });

  it("十三個內建代號都在掃描字典裡（代號增修時這條會提醒）", () => {
    expect(POLICY_CODES).toHaveLength(13);
    expect(POLICY_CODES).toContain("ANNUAL");
    expect(POLICY_CODES).toContain("COMPENSATORY");
  });

  it("沒有任何一支引擎或編排讀假別的身分", () => {
    const violations = files.flatMap(scan);
    const report = violations
      .map((item) => `${item.file}:${item.line} [${item.kind}] ${item.snippet}`)
      .join("\n");
    expect(report).toBe("");
  });

  /**
   * Info: (20260819 - Julian) 掃描器自己要被驗一次。
   *
   * 一個抓不到東西的檢查與一個沒有違規的程式庫，在測試報告上看起來相同。
   * 這一條餵它四種真實的違規寫法，要求它四種都抓到 —— 否則上面那條
   * 「沒有任何一支引擎讀假別的身分」證明的只是掃描器壞了。
   */
  it("掃描器抓得到四種寫法（用假的檔案餵它）", () => {
    const probe = (body: string): number => {
      const source = ts.createSourceFile(
        "probe.ts",
        body,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TS,
      );
      let hits = 0;
      const walk = (node: ts.Node): void => {
        const literal = literalTextOf(node);
        if (
          literal !== null &&
          POLICY_CODES.includes(literal) &&
          node.parent !== undefined &&
          !ts.isLiteralTypeNode(node.parent)
        ) {
          hits += 1;
        }
        if (isPolicyCodeMember(node)) hits += 1;
        if (ts.isSwitchStatement(node) && isCodeAccess(node.expression)) {
          hits += 1;
        }
        if (
          ts.isBinaryExpression(node) &&
          (node.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken ||
            node.operatorToken.kind ===
              ts.SyntaxKind.ExclamationEqualsEqualsToken) &&
          (isCodeAccess(node.left) || isCodeAccess(node.right))
        ) {
          hits += 1;
        }
        ts.forEachChild(node, walk);
      };
      ts.forEachChild(source, walk);
      return hits;
    };

    expect(probe(`const x = policy.code === "ANNUAL";`)).toBeGreaterThan(0);
    expect(probe(`const x = policy.code === LEAVE_POLICY_CODE.SICK;`)).toBeGreaterThan(0);
    expect(probe(`switch (policy.code) { default: break; }`)).toBeGreaterThan(0);
    expect(probe(`const m = { MARRIAGE: 1 }; const y = "MARRIAGE";`)).toBeGreaterThan(0);

    // Info: (20260819 - Julian) 反面：正常的引擎寫法不得被誤判
    expect(probe(`if (policy.quotaMode === LeaveQuotaMode.QUOTA) return 1;`)).toBe(0);
    expect(probe(`const days = policy.annualDays ?? 0;`)).toBe(0);
    expect(probe(`type Code = "ANNUAL" | "SICK";`)).toBe(0);
  });
});
