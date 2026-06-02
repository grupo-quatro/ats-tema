import EditEmailTemplateView from '@/features/email-templates/components/EditEmailTemplateView';

export default async function EditCommunicationTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <EditEmailTemplateView templateId={id} />;
}
