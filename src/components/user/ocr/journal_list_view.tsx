"use client";

import { useState } from "react";
// import { useTranslation } from "@/i18n/i18n_context";

export default function JournalListView() {
  // const { t } = useTranslation();

  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [displayType, setDisplayType] = useState<"grid" | "list">("list");
  // const [selectedPeriod, setSelectedPeriod] = useState<{
  //   startTimestamp: number;
  //   endTimestamp: number;
  // }>({
  //   startTimestamp: 0,
  //   endTimestamp: 0,
  // });

  return (
    <div className="flex size-full flex-col gap-2">
      {/* Info: (20260304 - Julian) Filter */}
      <div className="flex items-center gap-4">
        {/* Info: (20260304 - Julian) Search input */}
        <input
          aria-label="Search"
          type="text"
          className="flex-1 rounded-md border border-gray-200 bg-white px-2 py-1"
          placeholder="Search"
        />
        {/* Info: (20260304 - Julian) Date Picker */}
        <div className="flex">
          <div className="flex flex-col">
            <p>Start Date</p>
            <input type="date" />
          </div>
          <div className="flex flex-col">
            <p>End Date</p>
            <input type="date" />
          </div>
        </div>
        {/* Info: (20260304 - Julian) Sort by date */}
        <button
          type="button"
          onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
        >
          {sortOrder}
        </button>
        {/* Info: (20260304 - Julian) Display type */}
        <button
          type="button"
          onClick={() =>
            setDisplayType(displayType === "grid" ? "list" : "grid")
          }
        >
          {displayType}
        </button>
      </div>
      {/* Info: (20260304 - Julian) List */}
      <div className="flex flex-col bg-white">List</div>
    </div>
  );
}
