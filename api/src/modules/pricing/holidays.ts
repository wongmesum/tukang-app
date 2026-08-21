/**
 * Indonesian national holidays calendar.
 * Fixed-date holidays only. Variable holidays (Islamic calendar) need yearly updates.
 *
 * Format: "MM-DD" for fixed dates, or "YYYY-MM-DD" for specific year entries.
 */

// Fixed national holidays (same date every year)
const FIXED_HOLIDAYS: readonly string[] = [
  "01-01", // Tahun Baru
  "05-01", // Hari Buruh
  "06-01", // Hari Lahir Pancasila
  "08-17", // Hari Kemerdekaan
  "12-25", // Hari Natal
];

// Variable holidays per year (Islamic/Hindu calendar — update annually)
// Source: Keputusan Bersama Menteri (SKB 3 Menteri)
const VARIABLE_HOLIDAYS: Record<string, readonly string[]> = {
  "2026": [
    "2026-01-27", // Isra Mi'raj
    "2026-02-09", // Imlek
    "2026-03-03", // Hari Raya Nyepi
    "2026-03-20", // Maulid Nabi
    "2026-03-21", // Idul Fitri (estimasi)
    "2026-03-22", // Idul Fitri (estimasi)
    "2026-03-23", // Cuti bersama Idul Fitri
    "2026-03-24", // Cuti bersama Idul Fitri
    "2026-04-02", // Wafat Isa Al-Masih
    "2026-05-14", // Kenaikan Isa Al-Masih
    "2026-05-16", // Waisak
    "2026-05-28", // Idul Adha (estimasi)
    "2026-06-17", // Tahun Baru Hijriah
  ],
  "2027": [
    "2027-01-16", // Isra Mi'raj
    "2027-01-29", // Imlek
    "2027-03-10", // Maulid Nabi
    "2027-03-11", // Idul Fitri (estimasi)
    "2027-03-12", // Idul Fitri (estimasi)
    "2027-03-22", // Hari Raya Nyepi
    "2027-03-26", // Wafat Isa Al-Masih
    "2027-05-06", // Kenaikan Isa Al-Masih
    "2027-05-13", // Waisak
    "2027-05-18", // Idul Adha (estimasi)
    "2027-06-07", // Tahun Baru Hijriah
  ],
};

// Pre-compute a Set for fast lookups
const holidaySet = new Set<string>();

// Add fixed holidays for a range of years
for (let year = 2025; year <= 2030; year++) {
  for (const mmdd of FIXED_HOLIDAYS) {
    holidaySet.add(`${year}-${mmdd}`);
  }
}

// Add variable holidays
for (const dates of Object.values(VARIABLE_HOLIDAYS)) {
  for (const date of dates) {
    holidaySet.add(date);
  }
}

const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

/**
 * Check if a given date falls on an Indonesian national holiday.
 * Uses WIB (UTC+7) for date comparison.
 */
export function isNationalHoliday(date: Date): boolean {
  // Convert to WIB
  const wibTime = new Date(date.getTime() + WIB_OFFSET_MS);
  const year = wibTime.getUTCFullYear();
  const month = String(wibTime.getUTCMonth() + 1).padStart(2, "0");
  const day = String(wibTime.getUTCDate()).padStart(2, "0");
  const dateStr = `${year}-${month}-${day}`;

  return holidaySet.has(dateStr);
}
