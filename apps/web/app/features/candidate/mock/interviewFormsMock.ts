import type { EmployeeRole } from '@ats/shared-types';

export type InterviewFormType = 'hr' | 'tech';

export interface InterviewFormQuestion {
  id: string;
  question: string;
  answer: string;
  rating?: number;
}

export interface InterviewFormResponse {
  id: string;
  applicationId: string;
  type: InterviewFormType;
  title: string;
  authorName: string;
  authorRole: string;
  submittedAt: string;
  overallRating?: number;
  decision?: string;
  questions: InterviewFormQuestion[];
}

/**
 * Mock estático. Cuando el back implemente la persistencia, reemplazar
 * `fetchInterviewFormResponses` por una llamada al endpoint y mantener
 * el contrato (mismo shape de `InterviewFormResponse`) para no tocar UI.
 */
const MOCK_FORMS: InterviewFormResponse[] = [
  {
    id: 'form-hr-1',
    applicationId: '*',
    type: 'hr',
    title: 'Evaluación RRHH – Entrevista inicial',
    authorName: 'Laura Fernández',
    authorRole: 'Recursos Humanos',
    submittedAt: '2026-04-02T10:30:00.000Z',
    overallRating: 4,
    decision: 'Avanzar a entrevista técnica',
    questions: [
      {
        id: 'q1',
        question: 'Comunicación y claridad al expresarse',
        answer: 'Muy buena. Se expresa con claridad y escucha activa.',
        rating: 4,
      },
      {
        id: 'q2',
        question: 'Trabajo en equipo y adaptabilidad',
        answer:
          'Demostró experiencia liderando equipos chicos y adaptándose a cambios.',
        rating: 5,
      },
      {
        id: 'q3',
        question: 'Expectativa salarial',
        answer: 'USD 3.500 / mes en relación de dependencia.',
      },
      {
        id: 'q4',
        question: 'Disponibilidad y modalidad preferida',
        answer: 'Disponibilidad inmediata. Prefiere modalidad híbrida.',
      },
      {
        id: 'q5',
        question: 'Comentarios y observaciones',
        answer:
          'Perfil sólido en soft skills. Buen match cultural con el equipo.',
      },
    ],
  },
  {
    id: 'form-tech-1',
    applicationId: '*',
    type: 'tech',
    title: 'Evaluación técnica – Stack frontend',
    authorName: 'Carlos Méndez',
    authorRole: 'Líder técnico',
    submittedAt: '2026-04-08T15:00:00.000Z',
    overallRating: 5,
    decision: 'Avanzar a oferta',
    questions: [
      {
        id: 'q1',
        question: 'React',
        answer:
          'Domina hooks, patrones de composición y manejo de estado complejo.',
        rating: 5,
      },
      {
        id: 'q2',
        question: 'TypeScript',
        answer: 'Uso avanzado de tipos genéricos, utility types y discriminated unions.',
        rating: 5,
      },
      {
        id: 'q3',
        question: 'Next.js (App Router)',
        answer: 'Sólido en server components, routing y data fetching.',
        rating: 4,
      },
      {
        id: 'q4',
        question: 'Testing (Vitest / Jest)',
        answer: 'Buenas prácticas de testing, mocking y cobertura razonable.',
        rating: 4,
      },
      {
        id: 'q5',
        question: 'Nivel técnico general',
        answer:
          'Senior real. Capacidad para liderar decisiones técnicas y revisar PRs.',
        rating: 5,
      },
      {
        id: 'q6',
        question: 'Comentarios y observaciones',
        answer:
          'Excelente comunicación técnica. Justificó muy bien sus decisiones de arquitectura.',
      },
    ],
  },
  {
    id: 'form-hr-2',
    applicationId: '*',
    type: 'hr',
    title: 'Evaluación RRHH – Cierre / fit cultural',
    authorName: 'Laura Fernández',
    authorRole: 'Recursos Humanos',
    submittedAt: '2026-04-15T11:45:00.000Z',
    overallRating: 5,
    decision: 'Recomendado para oferta',
    questions: [
      {
        id: 'q1',
        question: 'Alineación con valores de la compañía',
        answer:
          'Muy alineado. Mencionó ejemplos concretos de cultura colaborativa.',
        rating: 5,
      },
      {
        id: 'q2',
        question: 'Motivación e interés por la posición',
        answer: 'Alta motivación. Hizo preguntas concretas sobre el equipo y producto.',
        rating: 5,
      },
      {
        id: 'q3',
        question: 'Observaciones finales',
        answer: 'Sin objeciones. Listo para presentar oferta.',
      },
    ],
  },
];

function filterByRole(
  forms: InterviewFormResponse[],
  role: EmployeeRole | null,
): InterviewFormResponse[] {
  if (!role) return forms;
  if (role === 'admin') return forms;
  if (role === 'hr') return forms.filter((f) => f.type === 'hr');
  if (role === 'tech_lead' || role === 'hiring_manager') {
    return forms.filter((f) => f.type === 'tech');
  }
  return forms;
}

/**
 * Reemplazar por una llamada real al backend cuando esté disponible.
 * Debe respetar la firma (applicationId, role) y devolver `InterviewFormResponse[]`.
 */
export async function fetchInterviewFormResponses(
  _applicationId: string,
  role: EmployeeRole | null,
): Promise<InterviewFormResponse[]> {
  await new Promise((resolve) => setTimeout(resolve, 350));
  return filterByRole(MOCK_FORMS, role);
}
