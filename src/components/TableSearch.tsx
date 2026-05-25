"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

const TableSearch = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get("search") || "");

  useEffect(() => {
    setValue(searchParams.get("search") || "");
  }, [searchParams]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const params = new URLSearchParams(window.location.search);
    const searchValue = value.trim();

    if (searchValue) {
      params.set("search", searchValue);
    } else {
      params.delete("search");
    }

    params.delete("page");

    const queryString = params.toString();
    router.push(`${window.location.pathname}${queryString ? `?${queryString}` : ""}`);
  };

  const handleClear = () => {
    setValue("");

    const params = new URLSearchParams(window.location.search);
    params.delete("search");
    params.delete("page");

    const queryString = params.toString();
    router.push(`${window.location.pathname}${queryString ? `?${queryString}` : ""}`);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full md:w-auto flex items-center gap-2 text-xs rounded-full ring-[1.5px] ring-gray-300 px-2"
    >
      <button type="submit" aria-label="Search" className="shrink-0">
        <Image src="/search.png" alt="" width={14} height={14} />
      </button>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search..."
        className="w-[200px] p-2 bg-transparent outline-none"
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={handleClear}
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-gray-500 hover:bg-slate-200"
        >
          <Image src="/close.png" alt="" width={8} height={8} />
        </button>
      )}
    </form>
  );
};

export default TableSearch;
