import { Badge } from "@/components/ui/badge";

const styles: Record<string, string> = {
  OPPORTUNITY: "border-sky-200 bg-sky-50 text-sky-700",
  ANALYSIS: "border-violet-200 bg-violet-50 text-violet-700",
  PROPOSAL_DRAFT: "border-amber-200 bg-amber-50 text-amber-700",
  AWAITING_PROPOSAL_APPROVAL: "border-amber-300 bg-amber-100 text-amber-800",
  CLIENT_RESPONSE: "border-indigo-200 bg-indigo-50 text-indigo-700",
  PLANNING: "border-blue-200 bg-blue-50 text-blue-700",
  EXECUTING: "border-emerald-200 bg-emerald-50 text-emerald-700",
  QA_GATE: "border-rose-200 bg-rose-50 text-rose-700",
  AWAITING_DELIVERY_APPROVAL: "border-orange-200 bg-orange-50 text-orange-700",
  DELIVERED: "border-lime-300 bg-lime-100 text-lime-800",
  ON_HOLD: "border-slate-200 bg-slate-100 text-slate-700",
  FAILED: "border-red-200 bg-red-50 text-red-700",
  CANCELLED: "border-slate-200 bg-slate-100 text-slate-500",
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge variant="outline" className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide ${styles[status] ?? "border-slate-200 bg-slate-50 text-slate-600"}`}>{status.replaceAll("_", " ")}</Badge>;
}
