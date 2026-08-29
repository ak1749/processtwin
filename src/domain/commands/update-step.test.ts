import { beforeEach, describe, expect, it } from 'vitest';

import { createRefundTemplate } from '../../data/templates/refund';
import { useProcessStore } from '../../stores/process-store';
import { updateStep } from './update-step';

beforeEach(() => {
  useProcessStore.setState({ process: createRefundTemplate(), stateVersion: 1, past: [], future: [], deltaLog: [] });
});

describe('updateStep duration validation', () => {
  it('returns the typical duration field path when it exceeds the maximum', () => {
    const result = updateStep({ actor: 'human' }, {
      id: 'manager-approval',
      changes: { duration: { minMinutes: 25, typicalMinutes: 481, maxMinutes: 480 } },
    });

    expect(result.ok).toBe(false);
    expect(result.error).toMatchObject({ code: 'INVALID_INPUT' });
    expect(result.error?.details).toMatchObject({ fieldPath: ['changes', 'duration', 'typicalMinutes'] });
  });
});
