/**
 * Info: (20260826 - Julian) 命令列旗標的取值，給 `scripts/` 底下的一次性腳本用。
 *
 * 抽成共用的理由是 `argv[argv.indexOf(flag) + 1]` 有一個很安靜的失效：
 * `--user --commit` 會把 `--commit` 當成 `--user` 的值 —— 查詢條件變成
 * `{ id: "--commit" }`（掃到 0 人），而 `--commit` 本身也就沒被當成旗標。
 * 兩件事同時發生時腳本什麼都不做卻 exit 0，看起來與「全部處理完畢」一樣，
 * 而這正是部署當下最容易打錯的形狀。
 *
 * ToDo: (20260826 - Julian) `backfill_faith_memory_aad.ts`、
 * `backfill_invite_email_match.ts`、`backfill_remove_team_admin.ts`、
 * `diagnose_subscription_state.ts`、`diagnose_wallet_conservation.ts`
 * 都是同一個寫法，應一併改走這支（不在本次通知模組的範圍內）。
 */
export type IFlagValue =
  | { ok: true; value: string | undefined }
  | { ok: false; error: string };

/**
 * Info: (20260826 - Julian) 回三態而不是 `string | undefined`。
 *
 * 「沒指定這個旗標」與「指定了但值不對」對呼叫端是兩件事：前者退回預設行為
 * （例如掃全站），後者必須中止。壓成同一個 `undefined` 的話，
 * 打錯的那一次會被當成「你想掃全站」—— 而這支腳本掃全站是不可逆的。
 */
export function readFlagValue(
  argv: readonly string[],
  flag: string,
): IFlagValue {
  const index = argv.indexOf(flag);
  if (index < 0) return { ok: true, value: undefined };

  // Info: (20260826 - Julian) 沒帶值、或帶的是下一個旗標，都不能靜默當成「沒指定」
  const next = argv[index + 1];
  if (!next || next.startsWith("--")) {
    return { ok: false, error: `${flag} 後面必須帶一個值（不能是下一個旗標）` };
  }
  return { ok: true, value: next };
}
