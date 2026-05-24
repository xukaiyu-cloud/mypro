export function extractError(e: unknown, fallback = '操作失败'): string {
  return ((e as { response?: { data?: { message?: string } } })?.response?.data?.message
    || (e as { message?: string })?.message
    || fallback)
}
