export interface NormalizableCandidateProfile {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  location?: string;
  yearsOfExperience?: number;
  education?: string;
  technicalSkills?: string[];
  skills?: string[];
  hardSkills?: string[];
  professionalSummary?: string;
}

export function normalizeText(value?: string): string | undefined {
  const normalized = value?.replace(/\s+/g, ' ').trim();
  return normalized || undefined;
}

export function normalizeEmail(value?: string): string | undefined {
  const normalized = value?.replace(/\s+/g, '').toLowerCase();
  return normalized || undefined;
}

export function normalizePhone(value?: string): string | undefined {
  const normalized = value?.replace(/\D/g, '');
  return normalized || undefined;
}

export function normalizeSkills(skills?: string[]): string[] | undefined {
  if (!skills) {
    return undefined;
  }

  // Deduplica sin alterar el casing de la primera variante recibida.
  const normalizedSkills = new Map<string, string>();

  for (const skill of skills) {
    const normalizedSkill = normalizeText(skill);
    if (!normalizedSkill) {
      continue;
    }

    const deduplicationKey = normalizedSkill.toLowerCase();
    if (!normalizedSkills.has(deduplicationKey)) {
      normalizedSkills.set(deduplicationKey, normalizedSkill);
    }
  }

  return [...normalizedSkills.values()];
}

export function normalizeYearsOfExperience(value?: number): number | undefined {
  if (
    value === undefined ||
    !Number.isInteger(value) ||
    value < 0 ||
    value > 60
  ) {
    return undefined;
  }

  return value;
}

export function normalizeCandidateProfile<
  T extends NormalizableCandidateProfile,
>(profile: T): T {
  return {
    ...profile,
    firstName: normalizeText(profile.firstName),
    lastName: normalizeText(profile.lastName),
    fullName: normalizeText(profile.fullName),
    email: normalizeEmail(profile.email),
    phone: normalizePhone(profile.phone),
    location: normalizeText(profile.location),
    yearsOfExperience: normalizeYearsOfExperience(profile.yearsOfExperience),
    education: normalizeText(profile.education),
    technicalSkills: normalizeSkills(profile.technicalSkills),
    skills: normalizeSkills(profile.skills),
    hardSkills: normalizeSkills(profile.hardSkills),
    professionalSummary: normalizeText(profile.professionalSummary),
  } as T;
}
