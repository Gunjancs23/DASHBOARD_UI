"use client";

import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

const fallbackSearchTargets: { [key: string]: string } = {
  admin: "/list/students",
  teacher: "/list/students",
  student: "/list/announcements",
  parent: "/list/announcements",
};

const NavbarSearch = ({ role }: { role: string }) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get("search") || "");

  useEffect(() => {
    setValue(searchParams.get("search") || "");
  }, [searchParams]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const params = new URLSearchParams(searchParams.toString());
    const searchValue = value.trim();
    const targetPath = pathname.startsWith("/list/")
      ? pathname
      : fallbackSearchTargets[role] || "/list/announcements";

    if (searchValue) {
      params.set("search", searchValue);
    } else {
      params.delete("search");
    }

    params.delete("page");

    const queryString = params.toString();
    router.push(`${targetPath}${queryString ? `?${queryString}` : ""}`);
  };

  const handleClear = () => {
    setValue("");

    const params = new URLSearchParams(searchParams.toString());
    const targetPath = pathname.startsWith("/list/")
      ? pathname
      : fallbackSearchTargets[role] || "/list/announcements";

    params.delete("search");
    params.delete("page");

    const queryString = params.toString();
    router.push(`${targetPath}${queryString ? `?${queryString}` : ""}`);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="hidden md:flex h-10 w-[260px] shrink-0 items-center gap-2 rounded-full bg-white px-3 text-xs ring-[1.5px] ring-gray-200 focus-within:ring-lamaSky"
    >
      <button type="submit" aria-label="Search" className="shrink-0">
        <Image src="/search.png" alt="" width={14} height={14} />
      </button>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search..."
        className="min-w-0 flex-1 bg-transparent outline-none"
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

export default NavbarSearch;
