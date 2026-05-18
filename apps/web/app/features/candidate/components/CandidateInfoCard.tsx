'use client';

import { Box, Button, Card, Divider, Typography } from '@mui/material';
import { Briefcase, FileText, GraduationCap, Mail, MapPin, Phone, User } from 'lucide-react';
import type { CandidateMockProfile } from '../mock/candidateMock';

interface CandidateInfoCardProps {
  candidate: CandidateMockProfile;
  onViewCv: () => void;
}

export function CandidateInfoCard({ candidate, onViewCv }: CandidateInfoCardProps) {
  return (
    <Card sx={{ p: 0, overflow: 'hidden' }}>
      <Box
        sx={(theme) => ({
          px: 3,
          py: 2.5,
          background: `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
        })}
      >
        <Typography sx={{ color: 'white', fontWeight: 500, fontSize: 16 }}>
          Datos Extraídos
        </Typography>
      </Box>

      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.5 }}>
          <User size={13} color="#64748b" />
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
            Información de Contacto
          </Typography>
        </Box>

        <Typography variant="body2" sx={{ fontWeight: 600, mb: 1.25 }}>
          {candidate.fullName}
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mb: 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Mail size={14} color="#64748b" />
            <Typography variant="body2" color="text.secondary">
              {candidate.email}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Phone size={14} color="#64748b" />
            <Typography variant="body2" color="text.secondary">
              {candidate.phone}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <MapPin size={14} color="#64748b" />
            <Typography variant="body2" color="text.secondary">
              {candidate.location}
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ mb: 2 }} />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.5 }}>
          <Briefcase size={13} color="#64748b" />
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
            Experiencia Laboral
          </Typography>
        </Box>

        {candidate.experience.map((exp, i) => (
          <Box key={i} sx={{ mb: i < candidate.experience.length - 1 ? 1.75 : 0 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main', lineHeight: 1.4 }}>
              {exp.role}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {exp.company}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {exp.period}
            </Typography>
          </Box>
        ))}

        <Divider sx={{ my: 2 }} />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.5 }}>
          <GraduationCap size={13} color="#64748b" />
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
            Educación
          </Typography>
        </Box>

        {candidate.education.map((edu, i) => (
          <Box key={i} sx={{ mb: i < candidate.education.length - 1 ? 1.75 : 0 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.4 }}>
              {edu.degree}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {edu.institution}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {edu.period}
            </Typography>
          </Box>
        ))}

        <Button
          variant="outlined"
          fullWidth
          startIcon={<FileText size={16} />}
          onClick={onViewCv}
          sx={{ mt: 2.5 }}
        >
          Ver CV Original
        </Button>
      </Box>
    </Card>
  );
}
