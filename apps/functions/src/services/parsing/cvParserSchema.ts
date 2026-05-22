import { Schema, SchemaType } from '@google-cloud/vertexai';

export const CV_PARSER_JSON_SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    fullName: {
      type: SchemaType.STRING,
      description: 'Nombre completo del candidato extraído del currículum',
    },
    email: {
      type: SchemaType.STRING,
      description: 'Correo electrónico institucional o personal de contacto',
    },
    phone: {
      type: SchemaType.STRING,
      description: 'Número telefónico de contacto con código de área',
    },
    location: {
      type: SchemaType.STRING,
      description:
        'Ciudad, provincia o país de residencia actual del postulante',
    },
    summary: {
      type: SchemaType.STRING,
      description:
        'Breve resumen, extracto o introducción del perfil profesional',
    },
    skills: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description:
        'Listado unificado de conocimientos, herramientas y palabras clave técnicas',
    },
    education: {
      type: SchemaType.ARRAY,
      description:
        'Historial completo de formación académica y cursos realizados',
      items: {
        type: SchemaType.OBJECT,
        properties: {
          institution: {
            type: SchemaType.STRING,
            description: 'Nombre de la universidad o entidad educativa',
          },
          degree: {
            type: SchemaType.STRING,
            description: 'Título obtenido o nombre de la certificación',
          },
          startDate: {
            type: SchemaType.STRING,
            description: 'Año o fecha estimada de inicio de la cursada',
          },
          endDate: {
            type: SchemaType.STRING,
            description: "Año de egreso o la palabra 'Actualidad'",
          },
        },
      },
    },
    experience: {
      type: SchemaType.ARRAY,
      description:
        'Historial cronológico de la trayectoria laboral del candidato',
      items: {
        type: SchemaType.OBJECT,
        properties: {
          company: {
            type: SchemaType.STRING,
            description: 'Nombre de la organización o empresa contratante',
          },
          role: {
            type: SchemaType.STRING,
            description: 'Cargo, puesto o rol ocupado',
          },
          startDate: {
            type: SchemaType.STRING,
            description: 'Fecha o año de ingreso al puesto',
          },
          endDate: {
            type: SchemaType.STRING,
            description:
              "Fecha de egreso o la palabra 'Actualidad' si continúa trabajando",
          },
          description: {
            type: SchemaType.STRING,
            description:
              'Resumen de responsabilidades primarias, tareas y logros clave',
          },
        },
      },
    },
  },
  required: [],
};
