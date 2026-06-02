'use client';

import { useRouter } from 'next/navigation';
import { Box, CircularProgress, Typography } from '@mui/material';
import type { UpdateEmailTemplateDTO } from '@ats/shared-types';
import EmailTemplateForm from './EmailTemplateForm';
import {
  useEmailTemplate,
  useUpdateEmailTemplate,
} from '../hooks/useEmailTemplates';

export default function EditEmailTemplateView({
  templateId,
}: {
  templateId: string;
}) {
  const router = useRouter();
  const { data: template, isLoading, isError } = useEmailTemplate(templateId);
  const updateMutation = useUpdateEmailTemplate(templateId);

  async function handleSubmit(payload: UpdateEmailTemplateDTO) {
    await updateMutation.mutateAsync(payload);
    router.push('/dashboard/communication-templates');
  }

  if (isLoading) {
    return (
      <Box
        sx={{
          minHeight: '100%',
          display: 'grid',
          placeItems: 'center',
          bgcolor: '#f8fafc',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (isError || !template) {
    return (
      <Box
        sx={{
          minHeight: '100%',
          display: 'grid',
          placeItems: 'center',
          bgcolor: '#f8fafc',
          p: 3,
        }}
      >
        <Typography sx={{ color: '#ef4444', textAlign: 'center' }}>
          No se encontró la plantilla solicitada.
        </Typography>
      </Box>
    );
  }

  return (
    <EmailTemplateForm
      mode="edit"
      template={template}
      isLoading={updateMutation.isPending}
      onSubmit={(payload) => handleSubmit(payload as UpdateEmailTemplateDTO)}
    />
  );
}
