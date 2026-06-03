'use client';

import { useRouter } from 'next/navigation';
import type { CreateEmailTemplateDTO } from '@ats/shared-types';
import EmailTemplateForm from './EmailTemplateForm';
import { useCreateEmailTemplate } from '../hooks/useEmailTemplates';

export default function CreateEmailTemplateView() {
  const router = useRouter();
  const createMutation = useCreateEmailTemplate();

  async function handleSubmit(payload: CreateEmailTemplateDTO) {
    await createMutation.mutateAsync(payload);
    router.push('/dashboard/communication-templates');
  }

  return (
    <EmailTemplateForm
      mode="create"
      isLoading={createMutation.isPending}
      onSubmit={(payload) => handleSubmit(payload as CreateEmailTemplateDTO)}
    />
  );
}
