import { TEMPLATE_VARIABLES, type EmailTemplate } from '@ats/shared-types';

export interface ResolverContext {
  candidateName: string;
  positionName: string;
  recruiterName: string;
  recruiterEmail: string;
  calendarLink: string;
  companyName: string;
  offerLink: string;
}

type VariableKeyToContextKey = {
  [K in keyof typeof TEMPLATE_VARIABLES]: keyof ResolverContext;
};

const VARIABLE_TO_CONTEXT_KEY: VariableKeyToContextKey = {
  CANDIDATE_NAME: 'candidateName',
  POSITION_NAME: 'positionName',
  RECRUITER_NAME: 'recruiterName',
  RECRUITER_EMAIL: 'recruiterEmail',
  CALENDAR_LINK: 'calendarLink',
  COMPANY_NAME: 'companyName',
  OFFER_LINK: 'offerLink',
} as const;

export class TemplateResolverService {
  resolve(
    template: EmailTemplate,
    context: ResolverContext,
  ): { subject: string; body: string } {
    let subject = template.subject;
    let body = template.body;

    for (const key of Object.keys(TEMPLATE_VARIABLES) as Array<
      keyof typeof TEMPLATE_VARIABLES
    >) {
      const label = TEMPLATE_VARIABLES[key].label;
      const contextKey = VARIABLE_TO_CONTEXT_KEY[key];
      const value = context[contextKey] ?? '';

      subject = subject.replaceAll(label, value);
      body = body.replaceAll(label, value);
    }

    return { subject, body };
  }
}
