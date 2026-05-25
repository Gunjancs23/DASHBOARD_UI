"use client";

import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export type TableFilterOption = {
  label: string;
  value: string;
};

export type TableFilterGroup = {
  label: string;
  param: string;
  options: TableFilterOption[];
  placeholder?: string;
};

const getValuesFromParams = (
  filters: TableFilterGroup[],
  searchParams: URLSearchParams
) =>
  filters.reduce<Record<string, string>>((values, filter) => {
    values[filter.param] = searchParams.get(filter.param) || "";
    return values;
  }, {});

const TableFilter = ({ filters }: { filters: TableFilterGroup[] }) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState(() =>
    getValuesFromParams(filters, searchParams)
  );

  useEffect(() => {
    setValues(getValuesFromParams(filters, searchParams));
  }, [filters, searchParams]);

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

  const activeCount = filters.filter((filter) =>
    searchParams.get(filter.param)
  ).length;

  const pushParams = (nextParams: URLSearchParams) => {
    nextParams.delete("page");

    const queryString = nextParams.toString();
    router.push(`${pathname}${queryString ? `?${queryString}` : ""}`);
  };

  const applyFilters = () => {
    const params = new URLSearchParams(searchParams.toString());

    filters.forEach((filter) => {
      const value = values[filter.param];

      if (value) {
        params.set(filter.param, value);
      } else {
        params.delete(filter.param);
      }
    });

    pushParams(params);
    setOpen(false);
  };

  const clearFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    const emptyValues = filters.reduce<Record<string, string>>(
      (nextValues, filter) => {
        params.delete(filter.param);
        nextValues[filter.param] = "";
        return nextValues;
      },
      {}
    );

    setValues(emptyValues);
    pushParams(params);
    setOpen(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        aria-label="Filter table"
        title="Filter"
        onClick={() => setOpen((current) => !current)}
        className={`relative flex h-8 w-8 items-center justify-center rounded-full bg-lamaYellow ${
          activeCount ? "ring-2 ring-purple-300" : ""
        }`}
      >
        <Image src="/filter.png" alt="" width={14} height={14} />
        {activeCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-purple-500 px-1 text-[10px] font-semibold text-white">
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-20 w-72 rounded-md border border-gray-100 bg-white p-3 text-sm shadow-lg">
          <div className="mb-3 flex items-center justify-between gap-3">
            <span className="font-semibold">Filters</span>
            {activeCount > 0 && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs font-semibold text-gray-500 hover:text-black"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex flex-col gap-3">
            {filters.map((filter) => (
              <label key={filter.param} className="flex flex-col gap-1">
                <span className="text-xs font-medium text-gray-500">
                  {filter.label}
                </span>
                <select
                  value={values[filter.param] || ""}
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      [filter.param]: event.target.value,
                    }))
                  }
                  className="h-9 rounded-md border border-gray-200 bg-white px-3 text-sm outline-none focus:border-lamaSky"
                >
                  <option value="">
                    {filter.placeholder || `All ${filter.label}`}
                  </option>
                  {filter.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>

          <button
            type="button"
            onClick={applyFilters}
            className="mt-4 h-9 w-full rounded-md bg-lamaYellow text-sm font-semibold"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
};

export default TableFilter;
