import { ref, uploadBytesResumable } from 'firebase/storage';
import { signInAnonymously } from 'firebase/auth';

import type {
  RegisterCandidatePayload,
  RegisterCandidateResponse,
  RegisterCandidateCVPayload,
  RegisterCandidateCVResponse,
} from '@ats/shared-types';

import { auth, storage, callFunction } from '../../shared/lib/firebase';
import type { ICandidateRepository } from '../interfaces/candidate.repository';

export class CandidateFirebaseRepository implements ICandidateRepository {
  private async ensureAuth(): Promise<void> {
    await signInAnonymously(auth);
  }

  async registerCandidate(
    payload: RegisterCandidatePayload,
  ): Promise<RegisterCandidateResponse> {
    await this.ensureAuth();
    const result = await callFunction<
      RegisterCandidatePayload,
      RegisterCandidateResponse
    >('registerCandidate', payload);
    return result.data;
  }

  async registerCandidateCV(
    payload: RegisterCandidateCVPayload,
  ): Promise<RegisterCandidateCVResponse> {
    await this.ensureAuth();
    const result = await callFunction<
      RegisterCandidateCVPayload,
      RegisterCandidateCVResponse
    >('registerCandidateCV', payload);
    return result.data;
  }

  uploadCv(candidateId: string, file: File): Promise<void> {
    return new Promise((resolve, reject) => {
      const storageRef = ref(storage, `cvs/${candidateId}/${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);
      uploadTask.on('state_changed', null, reject, () => resolve());
    });
  }
}
