const bahtFmt = new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const bahtFmt0 = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 });
const numFmt = new Intl.NumberFormat("th-TH");

export const formatBaht = (n: number, opts: { decimals?: boolean } = {}) =>
  (opts.decimals === false ? bahtFmt0 : bahtFmt).format(n);
export const formatNumber = (n: number) => numFmt.format(n);

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
export const formatShortDate = (iso: string) => {
  if (!iso) return "-";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" });
  } catch {
    return iso;
  }
};
export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("th-TH", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
export const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });

export const timeAgo = (iso: string, now: number) => {
  const diff = Math.max(0, now - new Date(iso).getTime());
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "เมื่อสักครู่";
  if (m < 60) return `${m} นาทีที่แล้ว`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ชม. ${m % 60} นาทีที่แล้ว`;
  return `${Math.floor(h / 24)} วันที่แล้ว`;
};

export const minutesSince = (iso: string, now: number) =>
  Math.floor((now - new Date(iso).getTime()) / 60_000);

export const daysUntil = (iso: string, now: number) =>
  Math.ceil((new Date(iso).getTime() - now) / (24 * 60 * 60_000));

export const formatPhone = (p: string) =>
  p.length === 10 ? `${p.slice(0, 3)}-${p.slice(3, 6)}-${p.slice(6)}` : p;
