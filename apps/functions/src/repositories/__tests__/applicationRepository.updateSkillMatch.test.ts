import { beforeEach, describe, expect, it, vi } from 'vitest';

const fieldValueMocks = vi.hoisted(() => ({
  delete: vi.fn(() => ({ __op: 'delete' })),
  serverTimestamp: vi.fn(() => ({ __op: 'serverTimestamp' })),
}));

vi.mock('../../core/firebaseAdmin', () => ({
  db: {
    collection: vi.fn(),
  },
}));

vi.mock('firebase-admin/firestore', () => ({
  FieldValue: fieldValueMocks,
  Timestamp: class {},
}));

import { db } from '../../core/firebaseAdmin';
import { ApplicationsRepository } from '../applicationRepository';

describe('ApplicationsRepository.updateSkillMatch', () => {
  const update = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (db.collection as any).mockReturnValue({
      doc: vi.fn(() => ({ update })),
    });
  });

  it('persiste el fitScore y el detalle calculado', async () => {
    const repository = new ApplicationsRepository();

    await repository.updateSkillMatch('application-1', {
      scoreTotal: 75,
      scoreMandatory: 100,
      scoreDesirable: 0,
      tieneTodosLosMandatorios: true,
      skillsCoincidentes: [{ name: 'react', weight: 3, type: 'mandatory' }],
      skillsFaltantes: [{ name: 'typescript', weight: 1, type: 'desirable' }],
    });

    expect(update).toHaveBeenCalledWith({
      fitScore: 75,
      skillMatchStats: expect.objectContaining({
        scoreTotal: 75,
        actualizadoEn: { __op: 'serverTimestamp' },
      }),
      updatedAt: { __op: 'serverTimestamp' },
    });
  });

  it('elimina el score cuando todavía no existe un cálculo válido', async () => {
    const repository = new ApplicationsRepository();

    await repository.updateSkillMatch('application-1', null);

    expect(update).toHaveBeenCalledWith({
      fitScore: { __op: 'delete' },
      skillMatchStats: { __op: 'delete' },
      updatedAt: { __op: 'serverTimestamp' },
    });
  });
});
