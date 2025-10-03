import { AsyncLocalStorage } from 'node:async_hooks';

export type JennyContext = {
  trace_id: string;
  session_id?: string;
  student_id?: string;
  request_id?: string;
  route?: string;
  user_agent?: string;
};

export const ctxStorage = new AsyncLocalStorage<JennyContext>();

export function withContext<T>(ctx: JennyContext, fn: () => T) {
  return ctxStorage.run(ctx, fn);
}

export function getContext(): JennyContext {
  return ctxStorage.getStore() || { trace_id: 'unknown' };
}

export function enrichContext(partial: Partial<JennyContext>) {
  const current = getContext();
  ctxStorage.enterWith({ ...current, ...partial });
}