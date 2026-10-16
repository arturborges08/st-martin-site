import { DAY_NAMES, weekdayFromIso } from "@/lib/time";
import type { WeekHour } from "@/lib/types";

export function formatMin(min: number): string {
  const hour = Math.floor(min / 60);
  const minute = min % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function formatDuration(min: number): string {
  if (min < 60) return `${min} min`;
  const hour = Math.floor(min / 60);
  const minute = min % 60;
  if (!minute) return `${hour}h`;
  return `${hour}h${String(minute).padStart(2, "0")}`;
}

export function presentPrice(label: string): string {
  const text = label.trim();
  if (!text || /confirmar/i.test(text)) return "Consulte";
  return text;
}

export function formatWhatsapp(value: string): string {
  const d = value.replace(/\D/g, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return value;
}

/** "sex, 16 out" — curto, para listas e avisos. */
export function formatDayShort(iso: string): string {
  const names = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
  const months = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  const [, month, day] = iso.split("-").map(Number);
  return `${names[weekdayFromIso(iso)]}, ${day} ${months[month - 1]}`;
}

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

export function isValidWhatsapp(value: string): boolean {
  const digits = digitsOnly(value);
  return digits.length === 10 || digits.length === 11;
}

export function whatsAppHref(display: string): string | null {
  const digits = digitsOnly(display);
  if (digits.length < 10 || digits.length > 13) return null;
  const withCountry = digits.startsWith("55") ? digits : `55${digits}`;
  if (withCountry.length < 12 || withCountry.length > 13) return null;
  return `https://wa.me/${withCountry}`;
}

export function safeHttp(url: string): string | null {
  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol === "https:" || parsed.protocol === "http:") return parsed.href;
  } catch {
    return null;
  }
  return null;
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function formatDayLabel(iso: string): string {
  const weekday = DAY_NAMES[weekdayFromIso(iso)] ?? "";
  const [, month, day] = iso.split("-");
  const months = [
    "janeiro",
    "fevereiro",
    "março",
    "abril",
    "maio",
    "junho",
    "julho",
    "agosto",
    "setembro",
    "outubro",
    "novembro",
    "dezembro",
  ];
  return `${weekday}, ${Number(day)} de ${months[Number(month) - 1]}`;
}

export function monthLabel(year: number, month: number): string {
  const months = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];
  return `${months[month - 1]} ${year}`;
}

export function groupHours(hours: WeekHour[]): Array<{ label: string; value: string }> {
  const sorted = [...hours].sort((a, b) => a.weekday - b.weekday);
  const groups: WeekHour[][] = [];
  for (const hour of sorted) {
    const current = groups.at(-1);
    const previous = current?.at(-1);
    const compatible =
      previous &&
      previous.isOpen === hour.isOpen &&
      previous.openMin === hour.openMin &&
      previous.closeMin === hour.closeMin &&
      previous.weekday + 1 === hour.weekday;
    if (compatible && current) current.push(hour);
    else groups.push([hour]);
  }
  return groups.map((group) => {
    const first = group[0];
    const last = group[group.length - 1];
    const label =
      first.weekday === last.weekday
        ? DAY_NAMES[first.weekday]
        : `${DAY_NAMES[first.weekday]} a ${DAY_NAMES[last.weekday].toLowerCase()}`;
    const value = first.isOpen
      ? `${formatMin(first.openMin)}–${formatMin(first.closeMin)}`
      : "Fechado";
    return { label, value };
  });
}

export function refCode(id: string): string {
  return `SM-${id.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
}

export function initials(name: string): string {
  const parts = name
    .split(" ")
    .map((part) => part.trim())
    .filter((part) => part && !/^(de|da|do|das|dos)$/i.test(part));
  const letters = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "");
  return letters.join("") || "SM";
}

export function errorText(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message && error.message.length < 220) {
    return error.message;
  }
  return fallback;
}
