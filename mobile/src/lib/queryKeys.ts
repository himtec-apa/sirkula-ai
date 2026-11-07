import type { FieldRole } from "@/types/sirkula";

export const queryKeys = {
  batches: {
    all: ["batches"] as const,
    listPrefix: ["batches", "list"] as const,
    list: (role: FieldRole) => ["batches", "list", role] as const,
    detail: (batchId: string) => ["batches", "detail", batchId] as const,
  },
  claims: {
    detail: (claimId: string) => ["claims", "detail", claimId] as const,
    byBatch: (batchId: string) => ["claims", "batch", batchId] as const,
  },
};
