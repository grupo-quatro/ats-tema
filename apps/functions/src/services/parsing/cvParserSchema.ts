export const CV_PROFILE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    personalInfo: {
      type: 'OBJECT',
      properties: {
        firstName: { type: 'STRING' },
        lastName: { type: 'STRING' },
        email: { type: 'STRING' },
        phone: { type: 'STRING' },
      },
      required: ['firstName', 'lastName'],
    },
    experience: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          company: { type: 'STRING' },
          position: { type: 'STRING' },
          startDate: { type: 'STRING', description: 'Format: YYYY-MM' },
          endDate: {
            type: 'STRING',
            description: "Format: YYYY-MM or 'Present'",
          },
          description: { type: 'STRING' },
        },
        required: ['company', 'position', 'startDate'],
      },
    },
    education: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          institution: { type: 'STRING' },
          degree: { type: 'STRING' },
          year: { type: 'STRING' },
        },
      },
    },
    skills: {
      type: 'ARRAY',
      items: { type: 'STRING' },
      description:
        "Normalizar nombres de tecnologías (ej: 'React' en lugar de 'ReactJS')",
    },
  },
  required: ['personalInfo', 'experience', 'skills'],
};
