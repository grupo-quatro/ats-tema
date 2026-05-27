export const CV_PARSER_JSON_SCHEMA = {
  type: 'OBJECT',
  properties: {
    firstName: {
      type: 'STRING',
      description: 'Nombre de pila del candidato.',
    },
    lastName: {
      type: 'STRING',
      description: 'Apellido o apellidos del candidato.',
    },
    fullName: {
      type: 'STRING',
      description: 'Nombre completo tal como aparece en el CV.',
    },
    email: {
      type: 'STRING',
      description: 'Correo electronico de contacto.',
    },
    phone: {
      type: 'STRING',
      description:
        'Telefono de contacto con codigo de area si esta disponible.',
    },
    location: {
      type: 'STRING',
      description: 'Ciudad, provincia o pais de residencia actual.',
    },
    yearsOfExperience: {
      type: 'INTEGER',
      description:
        'Anios de experiencia laboral estimados si el texto permite inferirlos con claridad.',
    },
    education: {
      type: 'STRING',
      description:
        'Resumen corto de la formacion principal, por ejemplo titulo e institucion.',
    },
    technicalSkills: {
      type: 'ARRAY',
      items: { type: 'STRING' },
      description:
        'Lista corta de skills tecnicas normalizadas y relevantes para evaluacion tecnica.',
    },
    professionalSummary: {
      type: 'STRING',
      description: 'Resumen profesional breve en una o dos frases.',
    },
  },
  required: [],
} as const;
