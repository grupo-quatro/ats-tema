'use client';

import {
  Box,
  TextField,
  Typography,
  Button,
  type TextFieldProps,
} from '@mui/material';
import type { LucideIcon } from 'lucide-react';
import { useRef } from 'react';

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
  fieldType?: 'text' | 'email' | 'tel' | 'number' | 'file';
  multiline?: boolean;
  minRows?: number;
  placeholder?: string;
  autoComplete?: string;
  slotProps?: TextFieldProps['slotProps'];
  accept?: string;
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
  accept,
  slotProps,
}: ManualProfileFormFieldProps) {
  const boxSx = gridColumnFull
    ? { gridColumn: { md: '1 / -1' as const } }
    : undefined;
  const inputRef = useRef<HTMLInputElement>(null);
  const isFileField = fieldType === 'file';

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    handleChange: (next: string) => void,
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      handleChange(file.name);
    }
  };

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
          {isFileField ? (
            <>
              <input
                ref={inputRef}
                id={field.name}
                name={field.name}
                type="file"
                accept={accept}
                style={{ display: 'none' }}
                onChange={(e) => handleFileChange(e, field.handleChange)}
                onBlur={field.handleBlur}
              />
              <Button
                onClick={() => inputRef.current?.click()}
                variant="outlined"
                fullWidth
                sx={{
                  py: 2,
                  px: 2,
                  textAlign: 'left',
                  justifyContent: 'flex-start',
                  textTransform: 'none',
                  fontSize: 14,
                  color: field.state.value ? 'text.primary' : 'text.secondary',
                  borderColor:
                    field.state.meta.errors.length > 0
                      ? 'error.main'
                      : 'divider',
                  backgroundColor: field.state.value
                    ? 'action.selected'
                    : 'transparent',
                  '&:hover': {
                    borderColor:
                      field.state.meta.errors.length > 0
                        ? 'error.main'
                        : 'primary.main',
                    backgroundColor: 'action.hover',
                  },
                }}
              >
                {field.state.value || placeholder || 'Seleccionar archivo'}
              </Button>
              {field.state.meta.errors.length > 0 && (
                <Typography
                  variant="caption"
                  sx={{ color: 'error.main', display: 'block', mt: 1 }}
                >
                  {field.state.meta.errors[0]}
                </Typography>
              )}
            </>
          ) : (
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
          )}
        </Box>
      )}
    </Field>
  );
}
