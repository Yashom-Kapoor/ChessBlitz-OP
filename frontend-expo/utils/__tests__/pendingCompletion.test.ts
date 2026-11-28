describe('pendingCompletion', () => {
  let trackCompletion: typeof import('@/utils/pendingCompletion').trackCompletion;
  let waitForPendingCompletion: typeof import('@/utils/pendingCompletion').waitForPendingCompletion;
  let isCompletionPending: typeof import('@/utils/pendingCompletion').isCompletionPending;

  beforeEach(() => {
    jest.resetModules();
    ({ trackCompletion, waitForPendingCompletion, isCompletionPending } = require('@/utils/pendingCompletion'));
  });
  afterEach(() => jest.useRealTimers());

  const deferred = () => {
    let resolve!: () => void, reject!: (error: Error) => void;
    const promise = new Promise<void>((res, rej) => { resolve = res; reject = rej; });
    return { promise, resolve, reject };
  };
  const isSettled = async (promise: Promise<void>) => {
    let settled = false;
    void promise.then(() => { settled = true; });
    for (let i = 0; i < 20; i++) await Promise.resolve();
    return settled;
  };

  it('reports whether any save is still running, failed saves included', async () => {
    const flush = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };
    expect(isCompletionPending()).toBe(false);
    const ok = deferred(), bad = deferred();
    trackCompletion(ok.promise);
    trackCompletion(bad.promise);
    expect(isCompletionPending()).toBe(true);
    ok.resolve();
    await flush();
    expect(isCompletionPending()).toBe(true);
    bad.reject(new Error('offline'));
    await flush();
    expect(isCompletionPending()).toBe(false);
  });

  it('resolves right away when nothing is saving', async () => {
    expect(await isSettled(waitForPendingCompletion())).toBe(true);
  });

  it('waits for every save started so far', async () => {
    const first = deferred(), second = deferred();
    trackCompletion(first.promise);
    trackCompletion(second.promise);
    const wait = waitForPendingCompletion();
    first.resolve();
    expect(await isSettled(wait)).toBe(false);
    second.resolve();
    expect(await isSettled(wait)).toBe(true);
  });

  it('treats a failed save as finished and never rejects', async () => {
    const save = deferred();
    trackCompletion(save.promise);
    const wait = waitForPendingCompletion();
    save.reject(new Error('offline'));
    await expect(wait).resolves.toBeUndefined();
  });

  it('gives up after the timeout so a hung save cannot block reloads', async () => {
    jest.useFakeTimers();
    trackCompletion(new Promise(() => {}));
    const wait = waitForPendingCompletion(5000);
    jest.advanceTimersByTime(4999);
    expect(await isSettled(wait)).toBe(false);
    jest.advanceTimersByTime(1);
    expect(await isSettled(wait)).toBe(true);
  });
});
