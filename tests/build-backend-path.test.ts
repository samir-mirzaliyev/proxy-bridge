import { describe, expect, it } from 'vitest';

import { buildBackendPath } from '../src/request/backend/build-backend-path.util';

describe('buildBackendPath', () => {
  it('joins the incoming proxy path segments', () => {
    expect(buildBackendPath(['users', 'me'])).toBe('users/me');
  });
});
