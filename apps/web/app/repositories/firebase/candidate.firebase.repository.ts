import { ref, uploadBytesResumable } from 'firebase/storage';
import { signInAnonymously } from 'firebase/auth';

import type {
  CandidatePostulationPayload,
  CandidatePostulationResponse,
  CandidatePostulationCVPayload,
  CandidatePostulationCVResponse,
  ConfirmCandidateProfilePayload,
  ConfirmCandidateProfileResponse,
  GetCandidateProfileForConfirmationPayload,
  GetCandidateProfileForConfirmationResponse,
} from '@ats/shared-types';

import { auth, storage } from '../../shared/lib/firebase';
import * as candidatesApi from '../../shared/api/candidatesApi';
import type { ICandidateRepository } from '../interfaces/candidate.repository';

export class CandidateFirebaseRepository implements ICandidateRepository {
  private async ensureAuth(): Promise<void> {
    await signInAnonymously(auth);
  }

  async registerCandidate(
    payload: CandidatePostulationPayload,
  ): Promise<CandidatePostulationResponse> {
    await this.ensureAuth();
    return candidatesApi.registerCandidate(payload);
  }

  async registerCandidateCV(
    payload: CandidatePostulationCVPayload,
  ): Promise<CandidatePostulationCVResponse> {
    await this.ensureAuth();
    return candidatesApi.registerCandidateCV(payload);
  }

  async getCandidateProfileForConfirmation(
    payload: GetCandidateProfileForConfirmationPayload,
  ): Promise<GetCandidateProfileForConfirmationResponse> {
    await this.ensureAuth();
    return candidatesApi.getCandidateProfileForConfirmation(payload);
  }

  async confirmCandidateProfile(
    payload: ConfirmCandidateProfilePayload,
  ): Promise<ConfirmCandidateProfileResponse> {
    await this.ensureAuth();
    return candidatesApi.confirmCandidateProfile(payload);
  }

  uploadCv(candidateId: string, file: File): Promise<void> {
    return new Promise((resolve, reject) => {
      const storageRef = ref(storage, `cvs/${candidateId}/${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);
      uploadTask.on('state_changed', null, reject, () => resolve());
    });
  }
}
