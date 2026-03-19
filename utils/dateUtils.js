export function dateDiff(from, to) {
  let years = to.getFullYear() - from.getFullYear();
  let months = to.getMonth() - from.getMonth();
  let days = to.getDate() - from.getDate();
  let hours = to.getHours() - from.getHours();
  let minutes = to.getMinutes() - from.getMinutes();
  let seconds = to.getSeconds() - from.getSeconds();
  if (seconds < 0) {
    seconds += 60;
    minutes--;
  }
  if (minutes < 0) {
    minutes += 60;
    hours--;
  }
  if (hours < 0) {
    hours += 24;
    days--;
  }
  if (days < 0) {
    months--;
    let prevMonth = new Date(to.getFullYear(), to.getMonth(), 0);
    days += prevMonth.getDate();
  }
  if (months < 0) {
    months += 12;
    years--;
  }
  const weeks = Math.floor(days / 7);
  days = days % 7;
  return { years, months, weeks, days, hours, minutes, seconds };
}

const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60 * MS_PER_SECOND;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;
const MS_PER_DAY = 24 * MS_PER_HOUR;
const MS_PER_WEEK = 7 * MS_PER_DAY;
const MS_PER_MONTH = 30.44 * MS_PER_DAY;
const MS_PER_YEAR = 365.25 * MS_PER_DAY;

const UNIT_ORDER = ["years", "months", "weeks", "days", "hours", "minutes", "seconds"];
const MS_PER_UNIT = {
  years: MS_PER_YEAR,
  months: MS_PER_MONTH,
  weeks: MS_PER_WEEK,
  days: MS_PER_DAY,
  hours: MS_PER_HOUR,
  minutes: MS_PER_MINUTE,
  seconds: MS_PER_SECOND,
};
const UNIT_LABELS = {
  years: (n) => (n !== 1 ? "años" : "año"),
  months: (n) => (n !== 1 ? "meses" : "mes"),
  weeks: (n) => (n !== 1 ? "semanas" : "semana"),
  days: (n) => (n !== 1 ? "días" : "día"),
  hours: (n) => (n !== 1 ? "horas" : "hora"),
  minutes: (n) => (n !== 1 ? "minutos" : "minuto"),
  seconds: (n) => (n !== 1 ? "segundos" : "segundo"),
};

function getActiveUnits(config) {
  return UNIT_ORDER.filter((u) => config[u]);
}

/** Formatos de fecha más comunes en España (2026) */
export const DATE_FORMAT_OPTIONS = [
  { value: "dd/MM/yyyy", label: "16/03/2026 (DD/MM/AAAA)", sep: "/" },
  { value: "dd-MM-yyyy", label: "16-03-2026 (DD-MM-AAAA)", sep: "-" },
  { value: "dd/MM/yy", label: "16/03/26 (DD/MM/AA)", sep: "/" },
];

/**
 * Formatea una fecha según el formato seleccionado.
 * @param {Date} date - Fecha a formatear
 * @param {string} formatKey - Clave del formato (ej: "dd/MM/yyyy")
 * @param {object} opts - { includeTime: boolean, shortForAnnual: boolean }
 */
export function formatDateDisplay(date, formatKey = "dd/MM/yyyy", opts = {}) {
  const { includeTime = false, shortForAnnual = false } = opts;
  const d = date.getDate().toString().padStart(2, "0");
  const M = (date.getMonth() + 1).toString().padStart(2, "0");
  const y = date.getFullYear();
  const yy = y.toString().slice(-2);

  let dateStr;
  switch (formatKey) {
    case "dd-MM-yyyy":
      dateStr = `${d}-${M}-${y}`;
      break;
    case "dd/MM/yy":
      dateStr = `${d}/${M}/${yy}`;
      break;
    case "dd/MM/yyyy":
    default:
      dateStr = `${d}/${M}/${y}`;
      break;
  }

  if (shortForAnnual) {
    return `${d}/${M}`;
  }
  if (includeTime) {
    const timeStr = date.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${dateStr} ${timeStr}`;
  }
  return dateStr;
}

/** Devuelve true si el texto formateado es singular (ej. "1 mes", "menos de un mes") */
export function isFirstValueSingular(formattedDiff) {
  return /^1\s/.test(formattedDiff) || /^menos de (un|una) /.test(formattedDiff);
}

export function formatDiff(diff, config, dates = null) {
  const activeUnits = getActiveUnits(config);
  const hasDates =
    dates && dates.from instanceof Date && dates.to instanceof Date;

  if (activeUnits.length > 0 && hasDates) {
    let ms = Math.abs(dates.to.getTime() - dates.from.getTime());
    const parts = [];
    for (const unit of UNIT_ORDER) {
      if (!activeUnits.includes(unit)) continue;
      const msPer = MS_PER_UNIT[unit];
      const isSeconds = unit === "seconds";
      const value = isSeconds ? Math.round(ms / msPer) : Math.floor(ms / msPer);
      if (value > 0 || (isSeconds && parts.length === 0)) {
        parts.push(`${value} ${UNIT_LABELS[unit](value)}`);
      }
      ms -= value * msPer;
      if (ms < 0) ms = 0;
    }
    if (parts.length > 0) {
      if (parts.length === 1) return parts[0];
      if (parts.length === 2) return parts.join(" y ");
      return parts.slice(0, -1).join(", ") + " y " + parts[parts.length - 1];
    }
  }

  let parts = [];
  if (config.years && diff.years)
    parts.push(`${diff.years} año${diff.years !== 1 ? "s" : ""}`);
  if (config.months && diff.months)
    parts.push(`${diff.months} mes${diff.months !== 1 ? "es" : ""}`);
  if (config.weeks && diff.weeks)
    parts.push(`${diff.weeks} semana${diff.weeks !== 1 ? "s" : ""}`);
  if (config.days && diff.days)
    parts.push(`${diff.days} día${diff.days !== 1 ? "s" : ""}`);
  if (config.hours && diff.hours)
    parts.push(`${diff.hours} hora${diff.hours !== 1 ? "s" : ""}`);
  if (config.minutes && diff.minutes)
    parts.push(`${diff.minutes} minuto${diff.minutes !== 1 ? "s" : ""}`);
  if (config.seconds && diff.seconds)
    parts.push(`${diff.seconds} segundo${diff.seconds !== 1 ? "s" : ""}`);
  if (parts.length === 0) {
    if (activeUnits.length > 0) {
      const smallestUnit = activeUnits[activeUnits.length - 1];
      const labels = {
        years: "año",
        months: "mes",
        weeks: "semana",
        days: "día",
        hours: "hora",
        minutes: "minuto",
        seconds: "segundo",
      };
      const art = smallestUnit === "hours" || smallestUnit === "weeks" ? "una" : "un";
      return `menos de ${art} ${labels[smallestUnit]}`;
    }
    return "0 segundos";
  }
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return parts.join(" y ");
  return parts.slice(0, -1).join(", ") + " y " + parts[parts.length - 1];
}

export function getNextOccurrence(baseDateInput, frequency, afterDate = null) {
  const baseDate = new Date(baseDateInput.getTime()); // Work with a copy

  if (frequency === "none") {
    // For non-recurring, the only occurrence is baseDate.
    // If afterDate is specified and baseDate is not strictly after it, then no "next" occurrence.
    if (
      afterDate &&
      baseDate.getTime() <= new Date(afterDate.getTime()).getTime()
    ) {
      return null;
    }
    return new Date(baseDate.getTime()); // Return a new Date object instance
  }

  // Determine the reference point. We want occurrences strictly after this point.
  // If afterDate is null, use (now - 1ms) to include occurrences happening "now".
  const comparisonDate = afterDate
    ? new Date(afterDate.getTime())
    : new Date(new Date().getTime() - 1);

  let currentOccurrence = new Date(baseDate.getTime());
  // The time part from baseDate is critical and should be preserved by advanceDateByFrequency.

  // Advance currentOccurrence until it is strictly greater than comparisonDate.
  // At each step, advanceDateByFrequency should give the next valid slot based on original baseDate rules.
  while (currentOccurrence.getTime() <= comparisonDate.getTime()) {
    const next = advanceDateByFrequency(currentOccurrence, frequency, baseDate); // baseDate is originalStartDate

    // If advanceDateByFrequency returns the same date or null, it means no further valid date can be found.
    if (!next || next.getTime() === currentOccurrence.getTime()) {
      return null; // Cannot advance further
    }
    currentOccurrence = next;
  }

  // currentOccurrence is now the first valid occurrence strictly after comparisonDate.
  return currentOccurrence;
}

export function advanceDateByFrequency(
  currentDate,
  frequency,
  originalStartDate
) {
  const next = new Date(currentDate.getTime());
  const originalDay = originalStartDate.getDate(); // Día del mes de la fecha de inicio original

  switch (frequency) {
    case "daily":
      next.setDate(next.getDate() + 1);
      break;
    case "weekly":
      next.setDate(next.getDate() + 7);
      break;
    case "monthly":
      // Guardar la hora actual porque setMonth puede alterarla por DST
      const hours = next.getHours();
      const minutes = next.getMinutes();
      const seconds = next.getSeconds();
      const ms = next.getMilliseconds();

      next.setMonth(next.getMonth() + 1);
      next.setDate(originalDay); // Intentar establecer el día original del mes

      // Si al establecer el día original, el mes cambió (e.g., de Feb a Mar si originalDay=31)
      // o si el día es menor (ej. originalDay=31, current es Feb 28, next.getDate() sería 3 o similar de Marzo)
      // entonces el día original no existe en este mes. Poner al último día del mes.
      if (next.getDate() !== originalDay) {
        // Retroceder al día 0 del mes actual (que es el último día del mes anterior al que saltó)
        // Esto efectivamente pone la fecha al último día del mes que queríamos (el mes después de 'currentDate')
        const tempMonth = (currentDate.getMonth() + 1) % 12;
        next.setMonth(tempMonth + 1); // Ir al mes siguiente del que queremos el último día
        next.setDate(0); // Último día del mes objetivo
      }
      next.setHours(hours, minutes, seconds, ms); // Restaurar la hora
      break;
    case "annual":
      next.setFullYear(next.getFullYear() + 1);
      break;
  }
  return next;
}
