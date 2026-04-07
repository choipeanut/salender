import type { ChangeSet, DetectChangesParams } from "./types";

export const computeChangeSet = (params: DetectChangesParams): ChangeSet => {
  const existingByExternalId = new Map(
    params.existingEvents.map((event) => [event.externalId, event])
  );
  const normalizedByExternalId = new Map(
    params.normalizedRecords.map((record) => [record.externalId, record])
  );

  const created = params.normalizedRecords.filter(
    (record) => !existingByExternalId.has(record.externalId)
  );

  const updated = params.normalizedRecords.filter((record) => {
    const existing = existingByExternalId.get(record.externalId);
    return Boolean(existing && existing.normalizedHash !== record.normalizedHash);
  });

  const unchanged = params.normalizedRecords.filter((record) => {
    const existing = existingByExternalId.get(record.externalId);
    return Boolean(existing && existing.normalizedHash === record.normalizedHash);
  });

  const ended = params.existingEvents.filter((event) => {
    if (event.status === "ended") {
      return false;
    }
    return !normalizedByExternalId.has(event.externalId);
  });

  return {
    created,
    updated,
    unchanged,
    ended
  };
};
