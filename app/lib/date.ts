/** 사용자 기기 기준 오늘 날짜 (YYYY-MM-DD). toISOString은 UTC라 한국에서 하루 어긋난다. */
export function localToday(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
