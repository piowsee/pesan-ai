import { getPaginationParams } from '@/lib/api-helper/pagination';
import { describe, expect, it } from 'vitest';

describe('pagination helper', { tags: ['backend'] }, () => {
  it('uses defaults when query params are absent', () => {
    expect(getPaginationParams(new URLSearchParams())).toEqual({
      page: 1,
      limit: 10,
    });

    expect(getPaginationParams(new URLSearchParams(), 25)).toEqual({
      page: 1,
      limit: 25,
    });
  });

  it('parses numeric page and limit query params', () => {
    expect(getPaginationParams(new URLSearchParams('page=4&limit=30'))).toEqual(
      {
        page: 4,
        limit: 30,
      },
    );
  });

  it('keeps page and limit inside supported bounds', () => {
    expect(getPaginationParams(new URLSearchParams('page=0&limit=0'))).toEqual({
      page: 1,
      limit: 1,
    });

    expect(
      getPaginationParams(new URLSearchParams('page=2&limit=999')),
    ).toEqual({
      page: 2,
      limit: 200,
    });
  });
});
