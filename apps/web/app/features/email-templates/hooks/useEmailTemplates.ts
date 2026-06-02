'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreateEmailTemplateDTO,
  UpdateEmailTemplateDTO,
} from '@ats/shared-types';
import {
  createEmailTemplate,
  deleteEmailTemplate,
  getEmailTemplate,
  listEmailTemplates,
  updateEmailTemplate,
} from '../emailTemplates.service';

const EMAIL_TEMPLATES_QUERY_KEY = ['email-templates'];

export function useEmailTemplates() {
  return useQuery({
    queryKey: EMAIL_TEMPLATES_QUERY_KEY,
    queryFn: listEmailTemplates,
  });
}

export function useEmailTemplate(id: string) {
  return useQuery({
    queryKey: [...EMAIL_TEMPLATES_QUERY_KEY, id],
    queryFn: () => getEmailTemplate(id),
  });
}

export function useCreateEmailTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateEmailTemplateDTO) =>
      createEmailTemplate(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EMAIL_TEMPLATES_QUERY_KEY });
    },
  });
}

export function useUpdateEmailTemplate(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateEmailTemplateDTO) =>
      updateEmailTemplate(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EMAIL_TEMPLATES_QUERY_KEY });
      queryClient.invalidateQueries({
        queryKey: [...EMAIL_TEMPLATES_QUERY_KEY, id],
      });
    },
  });
}

export function useDeleteEmailTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteEmailTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EMAIL_TEMPLATES_QUERY_KEY });
    },
  });
}
