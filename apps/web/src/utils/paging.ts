/** Page to load when the current page is empty because rows were decided. */
export function pageAfterEmpty(
  page: number,
  pageSize: number,
  total: number,
  itemCount: number,
): number | null {
  if (itemCount > 0 || total <= 0 || page <= 1 || pageSize < 1) return null
  const last = Math.max(1, Math.ceil(total / pageSize))
  return last === page ? null : last
}
