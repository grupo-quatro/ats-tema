import { CandidatePostulationBase } from '../../contracts/candidatePostulationBase';

export type ParsedCandidateProfileData = Partial<CandidatePostulationBase> & {
  rawText?: string;
  parserVersion?: string;
};
