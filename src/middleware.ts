import { NextRequest, NextResponse } from "next/server";
import {
  isHrModuleEnabled,
  isHrModulePath,
} from "@/constants/hr_module_gate";

/**
 * Info: (20260820 - Julian) 開發中的人事管理模組不對外開放（上線前的閘）。
 *
 * ## 為什麼在 middleware
 *
 * 它是**唯一**同時涵蓋畫面與 API 的地方，而兩者缺一不可：只擋畫面的話，
 * 37 支 `/hr/` 端點照樣回得出資料，而那才是真正會外洩的東西。
 * 只擋 API 的話，畫面進得去、只是每一格都是錯誤 —— 一個開發中的模組
 * 就這樣展示給訪客看。
 *
 * ## 為什麼回 404 而不是 403
 *
 * 403 說的是「這裡有東西，但你不能看」。這個模組還沒上線，
 * 對外的正確答案是「沒有這個路徑」—— 與任何一個不存在的網址完全一樣。
 *
 * ## 這道閘擋不了什麼
 *
 * 它是路徑層的閘，不是授權。模組打開之後，「誰可以看誰的資料」仍然由
 * 每一支端點自己的 `assertMay*` 負責 —— 那些檢查一條都不能因為有了這道閘
 * 而省略。這裡擋的是「整個模組還沒好」，不是「這個人不該看這一筆」。
 */
export function middleware(request: NextRequest): NextResponse {
  if (isHrModuleEnabled() || !isHrModulePath(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  /**
   * Info: (20260820 - Julian) 直接回 404，不 rewrite 到其他頁。
   *
   * rewrite 會讓狀態碼變成 200（Next 渲染的是另一頁），而一個回 200 的
   * 「找不到」對爬蟲與監控都是錯的訊號。這裡連 body 都最小化：
   * 一個不存在的路徑不會有內容。
   */
  return new NextResponse(null, { status: 404 });
}

/**
 * Info: (20260820 - Julian) 只在可能命中的路徑上執行。
 *
 * `matcher` 是效能考量，**不是**判準 —— 判準在 `isHrModulePath`。
 * 兩者若不一致，漏的那一側是 matcher（它比較寬），因此不會漏擋。
 * 寫寬一點也是刻意的：`/api/:path*` 涵蓋所有 API，讓「下一支 hr 端點
 * 掛在沒想過的位置」仍然會經過這支 middleware。
 */
export const config = {
  matcher: ["/hr_management/:path*", "/hr_management", "/api/:path*"],
};
