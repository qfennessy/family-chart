/**
 * Date utilities for family-chart
 *
 * These utilities handle date parsing and formatting while avoiding common timezone
 * issues, particularly the "December 31 of previous year" bug that occurs when
 * year-only dates are parsed as UTC midnight.
 */

/**
 * The precision level of a parsed date
 */
export type DatePrecision = 'year' | 'month' | 'day' | 'unknown'

/**
 * Represents a parsed date with precision information
 */
export interface DateInfo {
  /** The original string value */
  original: string
  /** The precision of the date */
  precision: DatePrecision
  /** The year (if parseable) */
  year: number | null
  /** The month (1-12, if available) */
  month: number | null
  /** The day (1-31, if available) */
  day: number | null
  /** Whether the date is valid */
  isValid: boolean
}

/**
 * Regular expressions for parsing different date formats
 */
const DATE_PATTERNS = {
  // Year only: "1995", "2020"
  yearOnly: /^\s*(\d{4})\s*$/,
  // Year-month: "1995-03", "2020-12", "03/1995", "12/2020"
  yearMonth: /^\s*(\d{4})-(\d{1,2})\s*$|^\s*(\d{1,2})\/(\d{4})\s*$/,
  // Full date ISO: "1995-03-15"
  isoDate: /^\s*(\d{4})-(\d{1,2})-(\d{1,2})\s*$/,
  // Full date US: "03/15/1995", "3/15/1995"
  usDate: /^\s*(\d{1,2})\/(\d{1,2})\/(\d{4})\s*$/,
  // Full date EU: "15/03/1995", "15.03.1995"
  euDate: /^\s*(\d{1,2})[\/.](\d{1,2})[\/.](\d{4})\s*$/,
}

/**
 * Parse a date string and return a DateInfo object with precision information.
 * This function avoids timezone issues by not creating JavaScript Date objects
 * for partial dates.
 *
 * @param dateStr - The date string to parse
 * @returns DateInfo object with parsed date information
 *
 * @example
 * ```typescript
 * parseDate("1995")
 * // { original: "1995", precision: "year", year: 1995, month: null, day: null, isValid: true }
 *
 * parseDate("1995-03-15")
 * // { original: "1995-03-15", precision: "day", year: 1995, month: 3, day: 15, isValid: true }
 * ```
 */
export function parseDate(dateStr: string | null | undefined): DateInfo {
  const result: DateInfo = {
    original: dateStr ?? '',
    precision: 'unknown',
    year: null,
    month: null,
    day: null,
    isValid: false,
  }

  if (!dateStr || typeof dateStr !== 'string') {
    return result
  }

  const trimmed = dateStr.trim()
  if (!trimmed) {
    return result
  }

  // Try year-only format first (most common for historical data)
  let match = trimmed.match(DATE_PATTERNS.yearOnly)
  if (match) {
    const year = parseInt(match[1], 10)
    if (isValidYear(year)) {
      result.year = year
      result.precision = 'year'
      result.isValid = true
      return result
    }
  }

  // Try year-month format
  match = trimmed.match(DATE_PATTERNS.yearMonth)
  if (match) {
    // Format: YYYY-MM or MM/YYYY
    const year = parseInt(match[1] || match[4], 10)
    const month = parseInt(match[2] || match[3], 10)
    if (isValidYear(year) && isValidMonth(month)) {
      result.year = year
      result.month = month
      result.precision = 'month'
      result.isValid = true
      return result
    }
  }

  // Try ISO date format (YYYY-MM-DD)
  match = trimmed.match(DATE_PATTERNS.isoDate)
  if (match) {
    const year = parseInt(match[1], 10)
    const month = parseInt(match[2], 10)
    const day = parseInt(match[3], 10)
    if (isValidYear(year) && isValidMonth(month) && isValidDay(day, month, year)) {
      result.year = year
      result.month = month
      result.day = day
      result.precision = 'day'
      result.isValid = true
      return result
    }
  }

  // Try US date format (MM/DD/YYYY)
  match = trimmed.match(DATE_PATTERNS.usDate)
  if (match) {
    const month = parseInt(match[1], 10)
    const day = parseInt(match[2], 10)
    const year = parseInt(match[3], 10)
    if (isValidYear(year) && isValidMonth(month) && isValidDay(day, month, year)) {
      result.year = year
      result.month = month
      result.day = day
      result.precision = 'day'
      result.isValid = true
      return result
    }
  }

  return result
}

/**
 * Format a DateInfo object to a display string based on its precision.
 * This ensures year-only dates display as just the year, not a full date.
 *
 * @param dateInfo - The DateInfo object to format
 * @param options - Formatting options
 * @returns Formatted date string
 *
 * @example
 * ```typescript
 * formatDateInfo(parseDate("1995"))
 * // "1995"
 *
 * formatDateInfo(parseDate("1995-03-15"), { locale: 'en-US' })
 * // "March 15, 1995"
 * ```
 */
export function formatDateInfo(
  dateInfo: DateInfo,
  options: {
    locale?: string
    yearFormat?: 'numeric' | '2-digit'
    monthFormat?: 'numeric' | '2-digit' | 'long' | 'short' | 'narrow'
    dayFormat?: 'numeric' | '2-digit'
  } = {}
): string {
  if (!dateInfo.isValid) {
    return dateInfo.original
  }

  const {
    locale = 'en-US',
    yearFormat = 'numeric',
    monthFormat = 'long',
    dayFormat = 'numeric',
  } = options

  switch (dateInfo.precision) {
    case 'year':
      return String(dateInfo.year)

    case 'month':
      // Create a date object just for formatting the month name
      // Use day 15 to avoid any edge cases
      const monthDate = new Date(dateInfo.year!, dateInfo.month! - 1, 15)
      return monthDate.toLocaleDateString(locale, {
        year: yearFormat,
        month: monthFormat,
      })

    case 'day':
      // Use noon to avoid timezone edge cases
      const fullDate = new Date(dateInfo.year!, dateInfo.month! - 1, dateInfo.day!, 12, 0, 0)
      return fullDate.toLocaleDateString(locale, {
        year: yearFormat,
        month: monthFormat,
        day: dayFormat,
      })

    default:
      return dateInfo.original
  }
}

/**
 * Format a date string directly, handling all precision levels automatically.
 * This is a convenience function that combines parseDate and formatDateInfo.
 *
 * @param dateStr - The date string to format
 * @param options - Formatting options
 * @returns Formatted date string
 *
 * @example
 * ```typescript
 * formatDate("1995")
 * // "1995"
 *
 * formatDate("1995-03-15")
 * // "March 15, 1995"
 * ```
 */
export function formatDate(
  dateStr: string | null | undefined,
  options: Parameters<typeof formatDateInfo>[1] = {}
): string {
  const dateInfo = parseDate(dateStr)
  return formatDateInfo(dateInfo, options)
}

/**
 * Compare two DateInfo objects for sorting.
 * Returns negative if a < b, positive if a > b, zero if equal.
 * Invalid dates are sorted to the end.
 *
 * @param a - First DateInfo
 * @param b - Second DateInfo
 * @returns Comparison result
 */
export function compareDateInfo(a: DateInfo, b: DateInfo): number {
  // Invalid dates go to the end
  if (!a.isValid && !b.isValid) return 0
  if (!a.isValid) return 1
  if (!b.isValid) return -1

  // Compare years
  if (a.year !== b.year) {
    return (a.year ?? 0) - (b.year ?? 0)
  }

  // Compare months (null months are considered as 1 for sorting)
  const aMonth = a.month ?? 1
  const bMonth = b.month ?? 1
  if (aMonth !== bMonth) {
    return aMonth - bMonth
  }

  // Compare days (null days are considered as 1 for sorting)
  const aDay = a.day ?? 1
  const bDay = b.day ?? 1
  return aDay - bDay
}

/**
 * Compare two date strings for sorting.
 * This is a convenience function for use in sort callbacks.
 *
 * @param a - First date string
 * @param b - Second date string
 * @returns Comparison result
 *
 * @example
 * ```typescript
 * const dates = ["1995", "1990-05-15", "1985"]
 * dates.sort(compareDates)
 * // ["1985", "1990-05-15", "1995"]
 * ```
 */
export function compareDates(a: string | null | undefined, b: string | null | undefined): number {
  return compareDateInfo(parseDate(a), parseDate(b))
}

/**
 * Convert a DateInfo to a JavaScript Date object.
 * Uses noon local time to avoid timezone edge cases.
 * Returns null for invalid dates or year-only/month-only dates.
 *
 * @param dateInfo - The DateInfo to convert
 * @returns Date object or null
 */
export function dateInfoToDate(dateInfo: DateInfo): Date | null {
  if (!dateInfo.isValid || dateInfo.precision !== 'day') {
    return null
  }
  // Use noon to avoid timezone issues
  return new Date(dateInfo.year!, dateInfo.month! - 1, dateInfo.day!, 12, 0, 0)
}

/**
 * Create a DateInfo from year, month, and day components.
 *
 * @param year - The year
 * @param month - The month (1-12), optional
 * @param day - The day (1-31), optional
 * @returns DateInfo object
 */
export function createDateInfo(year: number, month?: number, day?: number): DateInfo {
  const result: DateInfo = {
    original: '',
    precision: 'unknown',
    year: null,
    month: null,
    day: null,
    isValid: false,
  }

  if (!isValidYear(year)) {
    return result
  }

  result.year = year
  result.isValid = true

  if (month !== undefined && isValidMonth(month)) {
    result.month = month
    result.precision = 'month'
    result.original = `${year}-${String(month).padStart(2, '0')}`

    if (day !== undefined && isValidDay(day, month, year)) {
      result.day = day
      result.precision = 'day'
      result.original = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    }
  } else {
    result.precision = 'year'
    result.original = String(year)
  }

  return result
}

// Helper validation functions

function isValidYear(year: number): boolean {
  return Number.isInteger(year) && year >= 1 && year <= 9999
}

function isValidMonth(month: number): boolean {
  return Number.isInteger(month) && month >= 1 && month <= 12
}

function isValidDay(day: number, month: number, year: number): boolean {
  if (!Number.isInteger(day) || day < 1) return false

  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

  // Handle February in leap years
  if (month === 2 && isLeapYear(year)) {
    return day <= 29
  }

  return day <= daysInMonth[month - 1]
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0)
}
