import { DEMO_ACCOUNT_BOOK_ID } from "@/constants/attendance";
import { prisma } from "@/lib/prisma";
import { employeeRepo } from "@/repositories/employee.repo";
import { dbRepo } from "@/repositories/db.repo";

/**
 * Info: (20260813 - Julian) 把 passkey 登入帳號綁到 demo 帳本的員工檔。
 *
 * `User` 表沒有 email 欄位，passkey 使用者走不到 `linkOnFirstLogin` 的自動綁定，
 * 只能人工核對身分後執行本腳本補上 `Employee.userId`（用法見 parseArgs）。
 * 預設唯讀、只印出打算做的事，加 `--commit` 才真的寫入 ——
 * 重跑 `seed_attendance_demo` 會把 `Employee.userId` 一併歸零，需要再執行一次本腳本。
 */

const ACCOUNT_BOOK_ID = DEMO_ACCOUNT_BOOK_ID;

interface ICliOptions {
  commit: boolean;
  unlink: boolean;
  employeeNo?: string;
  address?: string;
}

function parseArgs(argv: string[]): ICliOptions {
  const options: ICliOptions = { commit: false, unlink: false };

  argv.forEach((arg) => {
    if (arg === "--commit") {
      options.commit = true;
    } else if (arg === "--unlink") {
      options.unlink = true;
    } else if (arg.startsWith("--employee-no=")) {
      options.employeeNo = arg.slice("--employee-no=".length).trim();
    } else if (arg.startsWith("--address=")) {
      options.address = arg.slice("--address=".length).trim();
    } else {
      throw new Error(`未知的參數：${arg}`);
    }
  });

  if (options.unlink && !options.employeeNo) {
    throw new Error("--unlink 必須指定 --employee-no");
  }
  if (options.address && !options.employeeNo) {
    throw new Error("--address 必須搭配 --employee-no");
  }

  return options;
}

/**
 * Info: (20260813 - Julian) 解除綁定；條件加 `accountBookId`
 * 是因為 `employeeNo` 在不同帳本之間可以重複。
 */
async function unlink(employeeNo: string, commit: boolean): Promise<void> {
  const employee = await prisma.employee.findFirst({
    where: { accountBookId: ACCOUNT_BOOK_ID, employeeNo },
    select: { id: true, name: true, employeeNo: true, userId: true },
  });

  if (!employee) throw new Error(`找不到員工 ${employeeNo}`);
  if (!employee.userId) {
    console.log(`ℹ️  ${employeeNo}（${employee.name}）本來就沒有綁定`);
    return;
  }

  console.log(
    `${commit ? "🔓 解除" : "（預演）將解除"} ${employeeNo}（${employee.name}）↔ user ${employee.userId}`,
  );

  if (commit) {
    await employeeRepo.unlinkUser(employee.id);
  }
}

/**
 * Info: (20260813 - Julian) 指名綁定：`--employee-no` + `--address`。
 *
 * 用 `address`（登入後寫進 `localStorage.user_address`）而非 `User.id` 指認登入者，
 * 因為 address 是現場唯一看得到的識別碼。
 */
async function linkExplicit(
  employeeNo: string,
  address: string,
  commit: boolean,
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { address },
    select: { id: true, name: true, address: true },
  });
  if (!user) throw new Error(`找不到 address 為 ${address} 的使用者`);

  const employee = await prisma.employee.findFirst({
    where: { accountBookId: ACCOUNT_BOOK_ID, employeeNo },
    select: { id: true, name: true, employeeNo: true, userId: true },
  });
  if (!employee) throw new Error(`找不到員工 ${employeeNo}`);

  if (employee.userId && employee.userId !== user.id) {
    throw new Error(
      `${employeeNo} 已綁定到另一個使用者（${employee.userId}）。要改綁請先 --unlink`,
    );
  }
  if (employee.userId === user.id) {
    console.log(`ℹ️  ${employeeNo}（${employee.name}）已經綁在這個帳號上`);
    return;
  }

  const taken = await prisma.employee.findUnique({
    where: { userId: user.id },
    select: { employeeNo: true, accountBookId: true },
  });
  if (taken) {
    throw new Error(
      `這個帳號已綁定到員工 ${taken.employeeNo}（帳本 ${taken.accountBookId}）—— 一個帳號只能對應一名員工`,
    );
  }

  console.log(
    `${commit ? "🔗 綁定" : "（預演）將綁定"} ${employeeNo}（${employee.name}）↔ ${user.name ?? "（無暱稱）"} ${user.address}`,
  );

  if (commit) {
    // Info: (20260814 - Julian) 走 repository：`linkUser` 是附條件更新（`where userId: null`），
    // 上面的檢查只是為了回一句看得懂的訊息，真正的把關在那裡
    const linked = await employeeRepo.linkUser(employee.id, user.id);
    if (!linked) {
      throw new Error(
        `${employeeNo} 在這一刻被綁走了（可能是同時登入的另一個分頁）。請重跑一次確認現況`,
      );
    }
  }
}

/**
 * Info: (20260813 - Julian) 自動配對：`User.name` 等於 `Employee.employeeNo`。
 *
 * 只在完全唯一時才動手，同名有兩個以上就跳過並報出來 ——
 * 猜錯的代價是有人冒名打卡，且在 DB 裡看起來完全正常。
 */
async function autoLink(commit: boolean): Promise<void> {
  const employees = await prisma.employee.findMany({
    where: { accountBookId: ACCOUNT_BOOK_ID },
    select: { id: true, name: true, employeeNo: true, userId: true },
    orderBy: { employeeNo: "asc" },
  });

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      address: true,
      employee: { select: { employeeNo: true } },
    },
  });

  console.log(`\n=== demo 帳本員工（${employees.length} 人）===`);
  employees.forEach((employee) => {
    const state = employee.userId ? `✅ 已綁 ${employee.userId}` : "—— 未綁定";
    console.log(`  ${employee.employeeNo}  ${employee.name}  ${state}`);
  });

  const unbound = users.filter((user) => !user.employee);
  console.log(`\n=== 尚未對應到員工的登入帳號（${unbound.length} 個）===`);
  unbound.forEach((user) => {
    console.log(`  ${user.name ?? "（無暱稱）"}  ${user.address}`);
  });

  const pending = employees.filter((employee) => !employee.userId);
  let linked = 0;

  for (const employee of pending) {
    const matches = unbound.filter(
      (user) =>
        (user.name ?? "").trim().toLowerCase() ===
        employee.employeeNo.toLowerCase(),
    );

    if (matches.length === 0) continue;
    if (matches.length > 1) {
      console.log(
        `\n⚠️  ${employee.employeeNo}：有 ${matches.length} 個帳號的暱稱都是這個編號，跳過。請改用 --address 指名`,
      );
      continue;
    }

    const user = matches[0];
    console.log(
      `\n${commit ? "🔗 綁定" : "（預演）將綁定"} ${employee.employeeNo}（${employee.name}）↔ ${user.address}`,
    );

    if (commit) {
      const bound = await employeeRepo.linkUser(employee.id, user.id);
      if (!bound) {
        console.log(`⚠️  ${employee.employeeNo}：在這一刻被綁走了，略過`);
        continue;
      }
    }
    linked += 1;
  }

  if (linked === 0) {
    console.log(
      "\nℹ️  沒有可自動配對的項目。註冊 passkey 時把暱稱填成員工編號（例如 EMP005），或用 --employee-no + --address 指名綁定。",
    );
  }
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));

  if (!options.commit) {
    console.log("🔍 預演模式：不會寫入任何資料。確認無誤後加上 --commit\n");
  }

  if (options.unlink) {
    await unlink(options.employeeNo as string, options.commit);
  } else if (options.employeeNo && options.address) {
    await linkExplicit(options.employeeNo, options.address, options.commit);
  } else if (options.employeeNo) {
    throw new Error("指名綁定需要同時給 --employee-no 與 --address");
  } else {
    await autoLink(options.commit);
  }

  console.log(options.commit ? "\n✅ 完成" : "\n（預演結束，未寫入）");
}

main()
  .catch((error) => {
    console.error(
      "❌ 綁定失敗：",
      error instanceof Error ? error.message : error,
    );
    process.exitCode = 1;
  })
  .finally(() => dbRepo.disconnect());
