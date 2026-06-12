import {
  FormControl,
  FormHelperText,
  FormLabel,
  MenuItem,
  Select,
  Typography,
} from '@mui/material';
import type { CandidateStageKey } from '../mock/candidateMock';
import type { InterviewDecisionOption } from '../utils/candidateProfile.utils';

interface InterviewDecisionSelectProps {
  value: CandidateStageKey | '';
  onChange: (value: CandidateStageKey | '') => void;
  options: InterviewDecisionOption[];
  disabled?: boolean;
}

export function InterviewDecisionSelect({
  value,
  onChange,
  options,
  disabled = false,
}: InterviewDecisionSelectProps) {
  return (
    <FormControl fullWidth sx={{ mb: 2 }}>
      <FormLabel sx={{ mb: 1, color: 'text.primary', fontWeight: 600 }}>
        Decisión Recomendada
        <Typography component="span" color="error.main">
          {' '}
          *
        </Typography>
      </FormLabel>
      <Select
        value={value}
        onChange={(event) =>
          onChange(event.target.value as CandidateStageKey | '')
        }
        disabled={disabled || options.length === 0}
        displayEmpty
        renderValue={(selected) => {
          if (!selected) {
            return (
              <Typography component="span" color="text.secondary">
                Seleccioná una decisión
              </Typography>
            );
          }

          return (
            options.find((option) => option.key === selected)?.label ?? selected
          );
        }}
        MenuProps={{
          disableScrollLock: true,
          slotProps: {
            paper: { sx: { maxHeight: 280 } },
          },
          sx: { zIndex: (theme) => theme.zIndex.modal + 1 },
        }}
      >
        {options.map((option) => (
          <MenuItem key={option.key} value={option.key}>
            {option.label}
          </MenuItem>
        ))}
      </Select>
      {options.length === 0 && (
        <FormHelperText>
          No hay decisiones disponibles para la etapa actual del candidato.
        </FormHelperText>
      )}
    </FormControl>
  );
}

export default InterviewDecisionSelect;
