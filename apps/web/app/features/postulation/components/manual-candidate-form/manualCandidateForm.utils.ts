import type { ParsedEducation, ParsedExperience } from '@ats/shared-types';

const MONTHS: Record<string, string> = {
  ene: '01',
  enero: '01',
  jan: '01',
  january: '01',
  feb: '02',
  febrero: '02',
  february: '02',
  mar: '03',
  marzo: '03',
  march: '03',
  abr: '04',
  abril: '04',
  apr: '04',
  april: '04',
  may: '05',
  mayo: '05',
  jun: '06',
  junio: '06',
  june: '06',
  jul: '07',
  julio: '07',
  july: '07',
  ago: '08',
  agosto: '08',
  aug: '08',
  august: '08',
  sep: '09',
  sept: '09',
  septiembre: '09',
  september: '09',
  oct: '10',
  octubre: '10',
  october: '10',
  nov: '11',
  noviembre: '11',
  november: '11',
  dic: '12',
  diciembre: '12',
  dec: '12',
  december: '12',
};

const CURRENT_DATE_VALUES = new Set([
  'actual',
  'actualidad',
  'presente',
  'present',
  'current',
  'today',
]);

export type DateRangeErrors = {
  experiences: Record<number, string>;
  educations: Record<number, string>;
};

export const emptyDateRangeErrors = (): DateRangeErrors => ({
  experiences: {},
  educations: {},
});

export function hasDateRangeErrors(errors: DateRangeErrors): boolean {
  return (
    Object.keys(errors.experiences).length > 0 ||
    Object.keys(errors.educations).length > 0
  );
}

function normalizeKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[._-]+/g, ' ')
    .replace(/\s+/g, ' ');
}

function normalizeSkillDedupKey(value: string): string {
  return normalizeKey(value).replace(/[^a-z0-9]+/g, '');
}

export function normalizeTechnicalSkills(value: string): string[] {
  const seen = new Set<string>();

  return value
    .split(',')
    .map((skill) => skill.trim().replace(/\s+/g, ' '))
    .filter((skill) => {
      const key = normalizeSkillDedupKey(skill);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export function normalizeDateForInput(value?: string | null): string {
  const rawValue = value?.trim();
  if (!rawValue) return '';

  const normalized = normalizeKey(rawValue);
  if (CURRENT_DATE_VALUES.has(normalized)) return '';

  const isoDateMatch = rawValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoDateMatch) return rawValue;

  const yearMonthMatch = rawValue.match(/^(\d{4})[-/](\d{1,2})$/);
  if (yearMonthMatch) {
    const year = yearMonthMatch[1];
    const month = yearMonthMatch[2];
    if (!year || !month) return '';

    return `${year}-${month.padStart(2, '0')}-01`;
  }

  const yearMatch = rawValue.match(/\b(19|20)\d{2}\b/);
  if (!yearMatch) return '';

  const monthKey = normalized.replace(yearMatch[0], '').trim().split(' ')[0];
  const month = monthKey ? (MONTHS[monthKey] ?? '01') : '01';

  return `${yearMatch[0]}-${month}-01`;
}

export function normalizeExperienceDates(
  experiences: ParsedExperience[],
): ParsedExperience[] {
  return experiences.map((experience) => ({
    ...experience,
    startDate: normalizeDateForInput(experience.startDate),
    endDate: normalizeDateForInput(experience.endDate),
  }));
}

export function normalizeEducationDates(
  educations: ParsedEducation[],
): ParsedEducation[] {
  return educations.map((education) => ({
    ...education,
    startDate: normalizeDateForInput(education.startDate),
    endDate: normalizeDateForInput(education.endDate),
  }));
}

function hasExperienceValue(experience: ParsedExperience): boolean {
  return Boolean(
    experience.role?.trim() ||
    experience.company?.trim() ||
    experience.startDate?.trim() ||
    experience.endDate?.trim() ||
    experience.description?.trim(),
  );
}

function hasEducationValue(education: ParsedEducation): boolean {
  return Boolean(
    education.degree?.trim() ||
    education.institution?.trim() ||
    education.startDate?.trim() ||
    education.endDate?.trim(),
  );
}

export function filterFilledExperiences(
  experiences: ParsedExperience[],
): ParsedExperience[] {
  return experiences.filter(hasExperienceValue);
}

export function filterFilledEducations(
  educations: ParsedEducation[],
): ParsedEducation[] {
  return educations.filter(hasEducationValue);
}

function validateRange(startDate?: string, endDate?: string): string | null {
  const start = startDate?.trim();
  const end = endDate?.trim();

  if (end && !start) return 'Completá la fecha desde.';
  if (!start || !end) return null;
  if (start >= end) return 'La fecha desde debe ser anterior a la fecha hasta.';

  return null;
}

export function validateProfileDateRanges(
  experiences: ParsedExperience[],
  educations: ParsedEducation[],
): DateRangeErrors {
  const errors = emptyDateRangeErrors();

  experiences.forEach((experience, index) => {
    if (!hasExperienceValue(experience)) return;

    const error = validateRange(experience.startDate, experience.endDate);
    if (error) errors.experiences[index] = error;
  });

  educations.forEach((education, index) => {
    if (!hasEducationValue(education)) return;

    const error = validateRange(education.startDate, education.endDate);
    if (error) errors.educations[index] = error;
  });

  return errors;
}

function toTime(value: string): number | null {
  const time = new Date(`${value}T00:00:00`).getTime();
  return Number.isNaN(time) ? null : time;
}

export function calculateApproximateYearsOfExperience(
  experiences: ParsedExperience[],
  today = new Date(),
): number | undefined {
  const todayTime = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  ).getTime();
  const ranges = filterFilledExperiences(experiences)
    .map((experience) => {
      if (!experience.startDate) return null;

      const start = toTime(experience.startDate);
      const end = experience.endDate ? toTime(experience.endDate) : todayTime;
      if (start === null || end === null || start >= end) return null;

      return { start, end };
    })
    .filter((range): range is { start: number; end: number } => Boolean(range))
    .sort((a, b) => a.start - b.start);

  if (!ranges.length) return undefined;

  const merged: Array<{ start: number; end: number }> = [];
  ranges.forEach((range) => {
    const previous = merged[merged.length - 1];
    if (!previous || range.start > previous.end) {
      merged.push({ ...range });
      return;
    }

    previous.end = Math.max(previous.end, range.end);
  });

  const totalMs = merged.reduce(
    (total, range) => total + range.end - range.start,
    0,
  );
  const years = totalMs / (365.25 * 24 * 60 * 60 * 1000);

  return Math.max(0, Math.round(years));
}

export function formatEducationSummary(
  educations: ParsedEducation[],
): string | undefined {
  const primaryEducation = filterFilledEducations(educations)[0];
  if (!primaryEducation) return undefined;

  const summary = [primaryEducation.degree, primaryEducation.institution]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(', ');

  return summary || undefined;
}
