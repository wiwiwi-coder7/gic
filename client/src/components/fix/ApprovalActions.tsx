import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Check, RotateCcw, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type Action = "approve" | "reject" | "request-changes";

export function ApprovalActions({ gatePublicId, onDone }: { gatePublicId: string; onDone?: () => void }) {
  const utils = trpc.useUtils();
  const [action, setAction] = useState<Action | null>(null);
  const [feedback, setFeedback] = useState("");
  const decide = trpc.fix.approvals.decide.useMutation({
    onSuccess: async () => {
      await Promise.all([utils.fix.dashboard.invalidate(), utils.fix.approvals.listPending.invalidate(), utils.fix.projects.invalidate()]);
      toast.success("Approval decision recorded and checkpointed.");
      setAction(null); setFeedback(""); onDone?.();
    },
    onError: error => toast.error(error.message),
  });
  const labels: Record<Action, string> = { approve: "Approve", reject: "Reject", "request-changes": "Request changes" };
  return <><div className="flex flex-wrap gap-2"><Button size="sm" onClick={() => setAction("approve")} className="bg-[#1f4b35] text-white hover:bg-[#286042]"><Check className="mr-1.5 h-3.5 w-3.5" />Approve</Button><Button size="sm" variant="outline" onClick={() => setAction("request-changes")}><RotateCcw className="mr-1.5 h-3.5 w-3.5" />Request changes</Button><Button size="sm" variant="outline" onClick={() => setAction("reject")} className="border-red-200 text-red-700 hover:bg-red-50"><X className="mr-1.5 h-3.5 w-3.5" />Reject</Button></div>
    <Dialog open={action !== null} onOpenChange={open => !open && setAction(null)}><DialogContent><DialogHeader><DialogTitle>{action ? labels[action] : "Decision"}</DialogTitle><DialogDescription>Every decision is preserved in the project timeline. {action === "request-changes" ? "Actionable feedback is required." : "You may add decision context for the responsible team."}</DialogDescription></DialogHeader><Textarea value={feedback} onChange={event => setFeedback(event.target.value)} placeholder={action === "request-changes" ? "Describe the changes required…" : "Optional decision note…"} className="min-h-28" /><DialogFooter><Button variant="outline" onClick={() => setAction(null)}>Cancel</Button><Button disabled={!action || decide.isPending || (action === "request-changes" && feedback.trim().length === 0)} onClick={() => action && decide.mutate({ gatePublicId, action, feedback: feedback.trim() || undefined })}>{decide.isPending ? "Saving…" : `Confirm ${action ? labels[action] : ""}`}</Button></DialogFooter></DialogContent></Dialog>
  </>;
}
