import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Play, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

type RuntimeAction = {
  publicId: string;
  actionType: string;
  status: string;
  latestLease?: { status: string; adapter: string; expiresAt: Date } | null;
};

export function WebActionExecutionControls({ action, projectPublicId, onDone }: { action: RuntimeAction; projectPublicId: string; onDone: () => void }) {
  const utils = trpc.useUtils();
  const complete = () => {
    onDone();
    utils.fix.approvals.listPending.invalidate();
  };
  const requestExecution = trpc.fix.sites.webActions.requestExecution.useMutation({
    onSuccess: () => { complete(); toast.success("One-time execution approval requested."); },
    onError: error => toast.error(error.message),
  });
  const execute = trpc.fix.sites.webActions.executeApproved.useMutation({
    onSuccess: result => { complete(); toast.success(result.status === "succeeded" ? "Public read executed and audited." : "Execution stopped safely and was audited."); },
    onError: error => toast.error(error.message),
  });
  if (action.actionType !== "read") return null;
  if (action.status === "draft") return <Button size="sm" variant="outline" disabled={requestExecution.isPending} onClick={() => requestExecution.mutate({ webActionPublicId: action.publicId })}><ShieldCheck className="mr-1.5 h-3.5 w-3.5" />Request execution approval</Button>;
  if (action.status === "approved" && action.latestLease?.status === "issued") return <Button size="sm" disabled={execute.isPending} onClick={() => execute.mutate({ webActionPublicId: action.publicId })}><Play className="mr-1.5 h-3.5 w-3.5" />Execute one-time read</Button>;
  if (action.status === "awaiting_approval") return <p className="text-[11px] text-amber-700">Execution is waiting for a separate human approval.</p>;
  if (["blocked", "failed"].includes(action.status)) return <p className="text-[11px] text-amber-700">Execution stopped safely. Prepare a new draft after addressing the audit reason.</p>;
  return null;
}
