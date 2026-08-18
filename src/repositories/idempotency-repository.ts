export type IdempotencyClaim =
  | { status: "claimed" }
  | { status: "in_progress" }
  | { status: "completed"; eventId: string };

export interface IdempotencyRepository {
  claim(key: string): Promise<IdempotencyClaim>;
  complete(key: string, eventId: string): Promise<void>;
  release(key: string): Promise<void>;
}
