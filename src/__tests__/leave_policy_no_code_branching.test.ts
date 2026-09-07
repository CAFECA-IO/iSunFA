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
 * （`i18n_keys.test.ts` 的檔頭記著它踩過的那次：測試拿自己的
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

/**
 * Info: (20260820 - Julian) **遞迴**走訪（review 第 6 條）。
 *
 * 原本只看根目錄那一層，於是把一支引擎搬進子目錄就等於把它移出這道牆
 * —— 而搬檔案的人不會看到任何紅燈。自己寫遞迴而不是用
 * `readdirSync({ recursive: true })`：後者的 `Dirent` 要拿到所在目錄
 * 需要 `parentPath`，而那是較新的 Node 才有的欄位，靜默失效的形狀
 * 正是這一條要避免的。
 */
const walk = (dir: string, match: RegExp, into: string[]): void => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, match, into);
      continue;
    }
    if (entry.isFile() && match.test(entry.name)) into.push(full);
  }
};

const collectFiles = (): string[] => {
  const files: string[] = [];
  for (const root of SCAN_ROOTS) {
    walk(join(process.cwd(), root.dir), root.match, files);
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

const parse = (fileName: string, text: string): ts.SourceFile =>
  ts.createSourceFile(
    fileName,
    text,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );

/**
 * Info: (20260820 - Julian) 收**已剖析的** `SourceFile`（review 第 6 條）。
 *
 * 原本它自己讀檔、自己剖析，於是下面那條「掃描器抓得到幾種寫法」餵不進
 * 一段字串，只好在測試裡**再抄一份訪問器**。兩份當天就已經分岔：
 * 這裡認四種等值運算子（`===` `!==` `==` `!=`），那一份只認兩種。
 *
 * 後果不是「少驗兩種」而是「這一份根本沒有被驗」：刪掉這裡的
 * `isSwitchStatement` 檢查，「沒有引擎讀假別的身分」照樣綠（本來零違規），
 * 「掃描器抓得到四種寫法」也照樣綠（它有自己的那一份）——
 * ADR 021 那道牆從此不擋 `switch (policy.code)`，而報告完全正常。
 * checklist §1.10：驗收與產品要讀同一支實作。
 *
 * 同一輪的 `hr_pii_id_no_default.test.ts` 做對了（自我驗證呼叫真的
 * `idLineOf` / `modelBlockOf`），這裡補齊。
 */
const scan = (source: ts.SourceFile, file: string): IViolation[] => {
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
        node.operatorToken.kind ===
          ts.SyntaxKind.ExclamationEqualsEqualsToken ||
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

const scanPath = (filePath: string): IViolation[] =>
  scan(
    parse(filePath, readFileSync(filePath, "utf8")),
    relative(process.cwd(), filePath),
  );

/** Info: (20260820 - Julian) 自我驗證走**同一支** `scan`，只是餵它一段字串 */
const probe = (body: string): string[] =>
  scan(parse("probe.ts", body), "probe.ts").map((item) => item.kind);

describe("T19：規則引擎不得對 LeavePolicy.code 分支（ADR 021 §2.1）", () => {
  const files = collectFiles();

  /**
   * Info: (20260819 - Julian) **掃描型測試的價值等於它的掃描根。**
   *
   * 一支掃到零個檔案的測試永遠是綠的，而它綠的時候看起來與真的守住了
   * 一模一樣。目錄改名、檔案搬家、`match` 寫錯，都會讓上面那支測試
   * 從「沒有違規」變成「沒有在看」—— 這一條把兩者分開。
   *
   * Info: (20260820 - Julian) 由「至少 10 支」改成**逐一列出**（review 第 6 條）。
   *
   * 下限值分不出「掃到 16 支」與「掃到 10 支、另外 6 支被漏掉」——
   * 而那正是這一條存在的理由。列成名單之後，新增一支引擎會紅（提醒作者
   * 這道牆現在也管它）、少掉一支也會紅（提醒有人把它移出了牆外）。
   */
  const EXPECTED_FILES: readonly string[] = [
    join("src", "lib", "leave_approval_chain.ts"),
    join("src", "lib", "leave_entitlement_rules.ts"),
    join("src", "lib", "leave_span.ts"),
    join("src", "lib", "overtime_rules.ts"),
    /**
     * Info: (20260820 - Julian) 這兩支是遞迴之後才進來的（原本只看根目錄那一層）。
     * 它們是錯誤碼 → i18n key 的對照，不碰假別代號，因此本來就乾淨 ——
     * 列在這裡是為了讓「牆管到哪裡」這件事寫得出來。
     */
    /**
     * Info: (20260820 - Julian) 展不開的成因 → i18n key（review 第 7 輪 M27）。
     * 與下面兩支同型：對照表，不碰假別代號。它進到這道牆裡是自動的
     * （檔名符合 `leave_*`），而這一條名單讓那件事說得出來。
     */
    join("src", "lib", "utils", "leave_chain_message.ts"),
    join("src", "lib", "utils", "leave_error_message.ts"),
    join("src", "lib", "utils", "overtime_error_message.ts"),
    /**
     * Info: (20260820 - Julian) 額度快取的每日勾稽（review 第 10 輪第 2 條）。
     * 它掛在 `services/cron/` 下，而掃描根是**遞迴**的 —— 這道牆本來就該
     * 管到它：一支會依假別重算額度的排程，正是最不該對代號分支的地方。
     */
    join("src", "services", "cron", "leave_balance_reconcile.cron.ts"),
    join("src", "services", "leave.service.ts"),
    join("src", "services", "leave_approval_rule.service.ts"),
    join("src", "services", "leave_balance.service.ts"),
    join("src", "services", "leave_policy.service.ts"),
    join("src", "services", "leave_request.service.ts"),
    join("src", "services", "leave_visibility.ts"),
    join("src", "services", "overtime_policy.service.ts"),
    join("src", "services", "overtime_report.service.ts"),
    join("src", "services", "overtime_request.service.ts"),
    join("src", "services", "overtime_visibility.ts"),
  ];

  it("掃描根確實掃到這 18 支（否則下面那條永遠是綠的）", () => {
    expect(files.map((path) => relative(process.cwd(), path))).toEqual(
      EXPECTED_FILES,
    );
  });

  it("十三個內建代號都在掃描字典裡（代號增修時這條會提醒）", () => {
    expect(POLICY_CODES).toHaveLength(13);
    expect(POLICY_CODES).toContain("ANNUAL");
    expect(POLICY_CODES).toContain("COMPENSATORY");
  });

  it("沒有任何一支引擎或編排讀假別的身分", () => {
    const violations = files.flatMap(scanPath);
    const report = violations
      .map((item) => `${item.file}:${item.line} [${item.kind}] ${item.snippet}`)
      .join("\n");
    expect(report).toBe("");
  });

  /**
   * Info: (20260819 - Julian) 掃描器自己要被驗一次。
   *
   * 一個抓不到東西的檢查與一個沒有違規的程式庫，在測試報告上看起來相同。
   *
   * Info: (20260820 - Julian) 這裡走的是**真的** `scan`（review 第 6 條），
   * 而且斷言的是**精確的違規種類清單**，不是 `toBeGreaterThan(0)` ——
   * 後者連「每個節點都算一次」的壞掃描器都會放行，而那種掃描器會讓
   * 上面那條「沒有違規」永遠紅，於是有人把它調鬆。
   */
  describe("掃描器自我驗證（走真的 scan）", () => {
    it.each([
      ["嚴格相等", `const x = policy.code === "ANNUAL";`],
      // Info: (20260820 - Julian) 雙等號先前只有 scan 認得，probe 那一份不認
      ["寬鬆相等", `const x = policy.code == "ANNUAL";`],
      ["嚴格不等", `const x = policy.code !== "ANNUAL";`],
      ["寬鬆不等", `const x = policy.code != "ANNUAL";`],
    ])("%s：等值比較 + 字串常值各一筆", (_label, body) => {
      expect(probe(body)).toEqual([
        "以假別代號做等值比較",
        "假別代號的字串常值",
      ]);
    });

    it("比對 LEAVE_POLICY_CODE 的成員：等值比較 + 取用成員", () => {
      expect(
        probe(`const x = policy.code === LEAVE_POLICY_CODE.SICK;`),
      ).toEqual(["以假別代號做等值比較", "取用 LEAVE_POLICY_CODE 的成員"]);
    });

    /**
     * Info: (20260820 - Julian) `switch` 這一條就是 mutation 的落點：
     * 刪掉 `scan` 裡的 `isSwitchStatement` 檢查，先前兩條測試都不會紅。
     */
    it("switch (policy.code)", () => {
      expect(probe(`switch (policy.code) { default: break; }`)).toEqual([
        "以假別代號做 switch",
      ]);
    });

    it("代號字串出現在值的位置（不必有比較）", () => {
      expect(probe(`const m = { MARRIAGE: 1 }; const y = "MARRIAGE";`)).toEqual(
        ["假別代號的字串常值"],
      );
    });

    /**
     * Info: (20260819 - Julian) 反面：正常的引擎寫法不得被誤判。
     *
     * Info: (20260820 - Julian) 「查詢不是分支」那條界線**不在規則裡**：
     * `where: { code: "COMPENSATORY" }` 這種寫法規則①照樣會認定為違規，
     * 它被放行是因為 `src/repositories/` 根本不在掃描根裡（見檔頭）。
     * 把它寫成一條「不算違規」的案例，會讓下一個人以為規則自己分得出來。
     */
    it.each([
      [
        "讀屬性而非身分",
        `if (policy.quotaMode === LeaveQuotaMode.QUOTA) return 1;`,
      ],
      ["讀法定面額", `const days = policy.annualDays ?? 0;`],
      ["型別位置的代號是宣告，不是分支", `type Code = "ANNUAL" | "SICK";`],
      ["讀 name 而非 code", `const label = policy.name ?? policy.id;`],
    ])("%s：不算違規", (_label, body) => {
      expect(probe(body)).toEqual([]);
    });
  });
});
