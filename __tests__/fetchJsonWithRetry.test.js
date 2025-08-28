/**
 * @jest-environment node
 */
import { jest } from '@jest/globals';
import { fetchJsonWithRetry } from '../src/data.js';

describe('fetchJsonWithRetry callbacks', () => {
  afterEach(() => {
    delete global.fetch;
  });

  test('uses injected callbacks to retry', async () => {
    const mockFetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ value: 42 }) });
    global.fetch = mockFetch;

    const onRetry = jest.fn(() => true); // retry once
    const onError = jest.fn();

    const result = await fetchJsonWithRetry('url', 'resource', { onRetry, onError });

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();
    expect(result).toEqual({ value: 42 });
  });

  test('default callbacks do not throw without window', async () => {
    const mockFetch = jest.fn().mockResolvedValue({ ok: false });
    global.fetch = mockFetch;

    await expect(fetchJsonWithRetry('url', 'thing')).rejects.toThrow(
      'Failed loading thing'
    );
  });
});
