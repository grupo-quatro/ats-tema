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
    parsedExperience: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          company: {
            type: 'STRING',
            description: 'Empresa u organizacion donde trabajo.',
          },
          role: {
            type: 'STRING',
            description: 'Cargo o rol desempenado.',
          },
          startDate: {
            type: 'STRING',
            description: 'Fecha de inicio tal como aparece o normalizada.',
          },
          endDate: {
            type: 'STRING',
            description:
              'Fecha de fin tal como aparece, o Presente/Actualidad si sigue vigente.',
          },
        },
        required: [],
      },
      description:
        'Experiencia laboral relevante en orden cronologico inverso. Omitir descripciones largas.',
    },
    parsedEducation: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          institution: {
            type: 'STRING',
            description: 'Institucion educativa.',
          },
          degree: {
            type: 'STRING',
            description: 'Titulo, carrera o formacion.',
          },
          startDate: {
            type: 'STRING',
            description: 'Fecha de inicio si esta disponible.',
          },
          endDate: {
            type: 'STRING',
            description:
              'Fecha de fin, actualidad o estado de cursada si esta disponible.',
          },
        },
        required: [],
      },
      description: 'Formaciones educativas detectadas en el CV.',
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
