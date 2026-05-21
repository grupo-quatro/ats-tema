import { ref, uploadBytesResumable } from 'firebase/storage';
import { signInAnonymously } from 'firebase/auth';

import type {
  CandidatePostulationPayload,
  CandidatePostulationResponse,
  CandidatePostulationCVPayload,
  CandidatePostulationCVResponse,
} from '@ats/shared-types';

import { auth, storage, callFunction } from '../../shared/lib/firebase';
import type { ICandidateRepository } from '../interfaces/candidate.repository';

export class CandidateFirebaseRepository implements ICandidateRepository {
  private async ensureAuth(): Promise<void> {
    await signInAnonymously(auth);
  }

  async registerCandidate(
    payload: CandidatePostulationPayload,
  ): Promise<CandidatePostulationResponse> {
    await this.ensureAuth();
    const result = await callFunction<
      CandidatePostulationPayload,
      CandidatePostulationResponse
    >('registerCandidate', payload);
    return result.data;
  }

  async registerCandidateCV(
    payload: CandidatePostulationCVPayload,
  ): Promise<CandidatePostulationCVResponse> {
    await this.ensureAuth();
    const result = await callFunction<
      CandidatePostulationCVPayload,
      CandidatePostulationCVResponse
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
