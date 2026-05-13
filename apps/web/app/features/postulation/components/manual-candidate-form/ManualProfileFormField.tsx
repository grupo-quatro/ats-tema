'use client';

import { Box, TextField, Typography, type TextFieldProps } from '@mui/material';
import type { LucideIcon } from 'lucide-react';

type FormFieldBag = {
  name: string;
  state: { value: string; meta: { errors: string[] } };
  handleBlur: () => void;
  handleChange: (next: string) => void;
};

export type MinimalFormFieldComponent = <TName extends string>(props: {
  name: TName;
  validators?: {
    onBlur?: (p: { value: string }) => string | undefined;
    onSubmit?: (p: { value: string }) => string | undefined;
  };
  children: (field: FormFieldBag) => React.ReactNode;
}) => React.ReactElement | null;

type ManualProfileFormFieldProps = {
  Field: MinimalFormFieldComponent;
  name: string;
  label: string;
  Icon: LucideIcon;
  required?: boolean;
  validators?: {
    onBlur?: (p: { value: string }) => string | undefined;
    onSubmit?: (p: { value: string }) => string | undefined;
  };
  gridColumnFull?: boolean;
  fieldType?: 'text' | 'email' | 'tel' | 'number';
  multiline?: boolean;
  minRows?: number;
  placeholder?: string;
  autoComplete?: string;
  slotProps?: TextFieldProps['slotProps'];
};

export function ManualProfileFormField({
  Field,
  name,
  label,
  Icon,
  required,
  validators,
  gridColumnFull,
  fieldType = 'text',
  multiline,
  minRows,
  placeholder,
  autoComplete,
  slotProps,
}: ManualProfileFormFieldProps) {
  const boxSx = gridColumnFull
    ? { gridColumn: { md: '1 / -1' as const } }
    : undefined;

  return (
    <Field name={name} validators={validators}>
      {(field) => (
        <Box sx={boxSx}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 1,
              mb: 1,
            }}
          >
            <Icon size={16} aria-hidden />
            <Typography
              component="label"
              htmlFor={field.name}
              variant="body1"
              sx={{ fontWeight: 500, color: 'text.secondary' }}
            >
              {label}
              {required ? (
                <Box component="span" sx={{ color: 'error.main', ml: 0.25 }}>
                  *
                </Box>
              ) : null}
            </Typography>
          </Box>
          <TextField
            id={field.name}
            name={field.name}
            variant="outlined"
            fullWidth
            type={multiline ? undefined : fieldType}
            multiline={multiline}
            minRows={multiline ? (minRows ?? 4) : undefined}
            placeholder={placeholder}
            autoComplete={autoComplete}
            value={field.state.value}
            onBlur={field.handleBlur}
            onChange={(e) => field.handleChange(e.target.value)}
            error={field.state.meta.errors.length > 0}
            helperText={field.state.meta.errors[0]}
            slotProps={slotProps}
          />
        </Box>
      )}
    </Field>
  );
}
