export type MaybePromise<T> = T | Promise<T>;

export async function resolveParamsId(params: MaybePromise<{ id: string }>): Promise<string> {
  const resolved = await Promise.resolve(params);
  return resolved.id;
}
