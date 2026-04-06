import { R2StorageClient } from './r2-storage';

export async function deleteStorageKeysBestEffort(
  storageClient: Pick<R2StorageClient, 'deleteObject'>,
  keys: Array<string | null | undefined>,
) {
  const uniqueKeys = Array.from(
    new Set(
      keys.filter(
        (key): key is string => typeof key === 'string' && key.trim().length > 0,
      ),
    ),
  );

  if (!uniqueKeys.length) {
    return {
      deletedKeys: [] as string[],
      failedKeys: [] as string[],
    };
  }

  const results = await Promise.allSettled(
    uniqueKeys.map(async (key) => {
      await storageClient.deleteObject(key);
      return key;
    }),
  );

  const deletedKeys: string[] = [];
  const failedKeys: string[] = [];

  results.forEach((result, index) => {
    const key = uniqueKeys[index];

    if (result.status === 'fulfilled') {
      deletedKeys.push(key);
      return;
    }

    failedKeys.push(key);
  });

  return {
    deletedKeys,
    failedKeys,
  };
}
