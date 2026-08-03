import Dashboard from "@/components/user/dashboard";

export default function UserMainPage() {
  /**
   * Info: (20260802 - Luphia) 深色模式取消漸層。
   * 由淺灰漸到白在淺色下是「往上發亮」的效果，深色下兩端都很暗，
   * 漸層只會變成一層說不出所以然的髒灰；而且卡片多半半透明，
   * 底下的明度變化會透上來讓同一張卡上下不同色。
   */
  return (
    <div className="dark:bg-surface-base flex min-h-screen flex-col bg-gradient-to-b from-gray-50 to-white dark:bg-none">
      <main className="relative flex-1">
        <Dashboard />
      </main>
    </div>
  );
}
