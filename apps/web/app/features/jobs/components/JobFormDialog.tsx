'use client';

import type { ComponentProps } from 'react';

import { Dialog, DialogContent, Box, CircularProgress } from '@mui/material';

import JobForm from './JobForm';

import { CreateJobDTO } from '../../../../../../packages/shared-types/src/models/job';

interface JobFormDialogProps extends Omit<
  ComponentProps<typeof Dialog>,
  'onClose' | 'onSubmit'
> {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateJobDTO) => Promise<void>;
  isLoading?: boolean;
}

export default function JobFormDialog({
  open,
  onClose,
  onSubmit,
  isLoading = false,
  ...dialogProps
}: JobFormDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: '20px',
            bgcolor: '#eef2f7',
          },
        },
      }}
      {...dialogProps}
    >
      <DialogContent
        sx={{
          p: 3,
          position: 'relative',
        }}
      >
        {isLoading && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'rgba(255,255,255,0.7)',
              zIndex: 20,
            }}
          >
            <CircularProgress />
          </Box>
        )}

        <JobForm
          onSubmit={async (data) => {
            await onSubmit(data);
            onClose();
          }}
          isLoading={isLoading}
          onCancel={onClose}
        />
      </DialogContent>
    </Dialog>
  );
}
