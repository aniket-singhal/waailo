import { apiFetch } from '@/lib/api/client';
import { tokenStore } from '@/lib/api/token-store';
import { ApiError } from '@/lib/api/types';

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: 'x',
    json: async () => body,
  } as unknown as Response;
}

describe('apiFetch', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    tokenStore.clear();
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it('attaches the bearer token when present', async () => {
    tokenStore.set({ accessToken: 'acc', refreshToken: 'ref', expiresIn: 900 });
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { id: '1' }));

    await apiFetch('/employees');

    const [, init] = fetchMock.mock.calls[0];
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer acc');
  });

  it('does not attach a token for anonymous requests', async () => {
    tokenStore.set({ accessToken: 'acc', refreshToken: 'ref', expiresIn: 900 });
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { ok: true }));

    await apiFetch('/auth/login', { method: 'POST', anonymous: true, body: {} });

    const [, init] = fetchMock.mock.calls[0];
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it('parses the error envelope into an ApiError', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(422, { error: { code: 'LEAVE_INSUFFICIENT_BALANCE', message: 'Not enough' } }),
    );

    const err = await apiFetch('/x').catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ code: 'LEAVE_INSUFFICIENT_BALANCE', status: 422 });
  });

  it('refreshes once on 401 and retries the original request', async () => {
    tokenStore.set({ accessToken: 'old', refreshToken: 'ref', expiresIn: 900 });
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, { error: { code: 'UNAUTHENTICATED', message: 'x' } }))
      .mockResolvedValueOnce(
        jsonResponse(200, { accessToken: 'new', refreshToken: 'ref2', expiresIn: 900 }),
      )
      .mockResolvedValueOnce(jsonResponse(200, { id: 'ok' }));

    const result = await apiFetch<{ id: string }>('/employees');

    expect(result).toEqual({ id: 'ok' });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    // The retried request uses the refreshed access token.
    const retryInit = fetchMock.mock.calls[2][1];
    expect((retryInit.headers as Record<string, string>).Authorization).toBe('Bearer new');
    expect(tokenStore.getAccess()).toBe('new');
  });

  it('clears tokens and throws when refresh fails', async () => {
    tokenStore.set({ accessToken: 'old', refreshToken: 'ref', expiresIn: 900 });
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, { error: { code: 'UNAUTHENTICATED', message: 'x' } }))
      .mockResolvedValueOnce(jsonResponse(401, { error: { code: 'INVALID_REFRESH_TOKEN', message: 'x' } }));

    await expect(apiFetch('/employees')).rejects.toBeInstanceOf(ApiError);
    expect(tokenStore.getAccess()).toBeNull();
  });

  it('returns undefined for 204 responses', async () => {
    tokenStore.set({ accessToken: 'acc', refreshToken: 'ref', expiresIn: 900 });
    fetchMock.mockResolvedValueOnce({ ok: true, status: 204 } as unknown as Response);

    const result = await apiFetch('/auth/logout', { method: 'POST' });
    expect(result).toBeUndefined();
  });
});
