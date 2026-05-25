export type SortDirection = "asc" | "desc";

export const getSortDirection = (value?: string): SortDirection =>
  value === "desc" ? "desc" : "asc";

export const getPageNumber = (page?: string) => {
  const parsedPage = page ? parseInt(page) : 1;

  return Number.isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;
};

export const getNumberParam = (value?: string) => {
  if (!value) return undefined;

  const parsedValue = Number(value);

  return Number.isInteger(parsedValue) ? parsedValue : undefined;
};
