"use client";

import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export type TableSortOption = {
  label: string;
  value: string;
};

type SortOrder = "asc" | "desc";

const getSortOrder = (value: string | null, fallback: SortOrder): SortOrder =>
  value === "asc" || value === "desc" ? value : fallback;

const TableSort = ({
  options,
  defaultOrder = "asc",
}: {
  options: TableSortOption[];
  defaultOrder?: SortOrder;
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const menuRef = useRef<HTMLDivElement>(null);
  const defaultSort = options[0]?.value || "";
  const [open, setOpen] = useState(false);
  const [sort, setSort] = useState(searchParams.get("sort") || defaultSort);
  const [order, setOrder] = useState<SortOrder>(
    getSortOrder(searchParams.get("order"), defaultOrder)
  );

  useEffect(() => {
    setSort(searchParams.get("sort") || defaultSort);
    setOrder(getSortOrder(searchParams.get("order"), defaultOrder));
  }, [defaultOrder, defaultSort, searchParams]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (
        menuRef.current &&
        event.target instanceof Node &&
        !menuRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const hasActiveSort = Boolean(searchParams.get("sort") || searchParams.get("order"));

  const pushParams = (params: URLSearchParams) => {
    params.delete("page");

    const queryString = params.toString();
    router.push(`${pathname}${queryString ? `?${queryString}` : ""}`);
  };

  const applySort = () => {
    const params = new URLSearchParams(searchParams.toString());

    if (sort) {
      params.set("sort", sort);
      params.set("order", order);
    } else {
      params.delete("sort");
      params.delete("order");
    }

    pushParams(params);
    setOpen(false);
  };

  const clearSort = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("sort");
    params.delete("order");
    setSort(defaultSort);
    setOrder(defaultOrder);
    pushParams(params);
    setOpen(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        aria-label="Sort table"
        title="Sort"
        onClick={() => setOpen((current) => !current)}
        className={`relative flex h-8 w-8 items-center justify-center rounded-full bg-lamaYellow ${
          hasActiveSort ? "ring-2 ring-purple-300" : ""
        }`}
      >
        <Image src="/sort.png" alt="" width={14} height={14} />
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-20 w-72 rounded-md border border-gray-100 bg-white p-3 text-sm shadow-lg">
          <div className="mb-3 flex items-center justify-between gap-3">
            <span className="font-semibold">Sort</span>
            {hasActiveSort && (
              <button
                type="button"
                onClick={clearSort}
                className="text-xs font-semibold text-gray-500 hover:text-black"
              >
                Clear
              </button>
            )}
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-500">Field</span>
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value)}
              className="h-9 rounded-md border border-gray-200 bg-white px-3 text-sm outline-none focus:border-lamaSky"
            >
              {options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setOrder("asc")}
              className={`h-9 rounded-md text-sm font-semibold ${
                order === "asc" ? "bg-lamaSky" : "bg-slate-100 text-gray-600"
              }`}
            >
              Asc
            </button>
            <button
              type="button"
              onClick={() => setOrder("desc")}
              className={`h-9 rounded-md text-sm font-semibold ${
                order === "desc" ? "bg-lamaSky" : "bg-slate-100 text-gray-600"
              }`}
            >
              Desc
            </button>
          </div>

          <button
            type="button"
            onClick={applySort}
            className="mt-4 h-9 w-full rounded-md bg-lamaYellow text-sm font-semibold"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
};

export default TableSort;
