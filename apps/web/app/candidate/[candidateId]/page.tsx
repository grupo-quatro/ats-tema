'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Box, CircularProgress, Container, Typography } from '@mui/material';
import type { ApplicationWithCandidateDTO } from '@ats/shared-types';
import { CandidateProfileView } from '@/features/candidate/components/CandidateProfileView';
import { CANDIDATE_SESSION_KEY } from '@/features/pipeline/components/CandidatePipelineRoute';
import type { CandidateMockProfile } from '@/features/candidate/mock/candidateMock';
import { mapDetailToProfile } from '@/features/candidate/utils/candidateProfile.utils';
import { ref, getDownloadURL } from 'firebase/storage';
import { storage } from '@/shared/lib/firebase';
import { getApplicationDetail } from '@/shared/api/applicationsApi';

export default function CandidatePage() {
  const params = useParams();
  const [profile, setProfile] = useState<CandidateMockProfile | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem(CANDIDATE_SESSION_KEY);
    if (!raw) {
      setNotFound(true);
      return;
    }

    try {
      const application = JSON.parse(raw) as ApplicationWithCandidateDTO;
      if (application.candidateId !== params.candidateId) {
        setNotFound(true);
        return;
      }

      getApplicationDetail(application.id)
        .then(async (detail) => {
          const profile = mapDetailToProfile(detail);
          if (detail.candidate.cvStoragePath) {
            try {
              profile.cvMockUrl = await getDownloadURL(
                ref(storage, detail.candidate.cvStoragePath),
              );
            } catch (err) {
              console.error('[CandidatePage] getDownloadURL falló:', err);
            }
          }
          setProfile(profile);
        })
        .catch(() => setNotFound(true));
    } catch {
      setNotFound(true);
    }
  }, [params.candidateId]);

  if (notFound) {
    return (
      <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
        <Typography variant="h5" sx={{ mb: 2 }}>
          Candidato no encontrado
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Accedé al perfil desde el listado de candidatos de una posición.
        </Typography>
      </Container>
    );
  }

  if (!profile) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  return <CandidateProfileView candidate={profile} />;
}
