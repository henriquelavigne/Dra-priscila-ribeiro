const DAYS_PT_BR = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
const DAYS_SHORT = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const MONTHS_PT_BR = ["", "janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

export function formatDateBR(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

export function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function getCurrentMonthYear(): { month: number; year: number } {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

export function toISODate(date: Date): string {
  return date.toISOString().split("T")[0];
}

export function getCurrentDateInfo(): {
  date: string;
  dayOfWeek: string;
  month: number;
  year: number;
  monthName: string;
} {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return {
    date,
    dayOfWeek: DAYS_PT_BR[now.getDay()],
    month,
    year,
    monthName: MONTHS_PT_BR[month],
  };
}

export function formatDatePtBr(date: string): string {
  const [y, m, d] = date.split("-");
  return `${d}/${m}/${y}`;
}

export function getDayOfWeekPtBr(date: string): string {
  const d = new Date(date + "T12:00:00");
  return DAYS_PT_BR[d.getDay()];
}

export function getDayOfWeekShort(date: string): string {
  const d = new Date(date + "T12:00:00");
  return DAYS_SHORT[d.getDay()];
}

export function getAllDaysOfWeekInMonth(dayOfWeek: number, month: number, year: number): string[] {
  const results: string[] = [];
  const daysInMonth = new Date(year, month, 0).getDate();

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month - 1, day);
    if (d.getDay() === dayOfWeek) {
      const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      results.push(iso);
    }
  }

  return results;
}

export function getNextMonth(month: number, year: number): { month: number; year: number } {
  return month === 12 ? { month: 1, year: year + 1 } : { month: month + 1, year };
}
