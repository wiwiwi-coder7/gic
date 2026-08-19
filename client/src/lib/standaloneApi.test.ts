import { describe, expect, it } from "vitest";
import { camelize } from "./standaloneApi";

describe("camelize", () => {
  it("normalizes nested Supabase payload fields for legacy page contracts", () => {
    expect(camelize({ public_id: "prj_123", budget_cents: 2500, pending_approvals: [{ created_at: "2026-08-15T00:00:00.000Z" }] })).toEqual({ publicId: "prj_123", budgetCents: 2500, pendingApprovals: [{ createdAt: "2026-08-15T00:00:00.000Z" }] });
  });
});
