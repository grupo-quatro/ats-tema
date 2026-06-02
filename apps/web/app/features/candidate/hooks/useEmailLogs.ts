'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getEmailLogs, retryEmailSend } from '@/shared/api/emailLogsApi';

const emailLogsQueryKey = (candidateId: string) => ['email-logs', candidateId];

export function useEmailLogs(candidateId: string) {
  return useQuery({
    queryKey: emailLogsQueryKey(candidateId),
    queryFn: () => getEmailLogs(candidateId).then((res) => res.logs),
    enabled: Boolean(candidateId),
  });
}

export function useRetryEmailSend(candidateId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (logId: string) => retryEmailSend(logId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: emailLogsQueryKey(candidateId),
      });
    },
  });
}
