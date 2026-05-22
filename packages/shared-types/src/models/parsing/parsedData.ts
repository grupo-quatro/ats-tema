import { ParsedCV } from './parsedCv';

export type ParsedCandidateProfileData = ParsedCV & {
  parserVersion?: string;
};
