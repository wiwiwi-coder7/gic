import AccessRestricted from "@/pages/AccessRestricted";
import { ApprovalActions } from "@/components/fix/ApprovalActions";
import { StatusBadge } from "@/components/fix/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, CircleAlert, ShieldAlert } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";

export default function Approvals() {
  const { user } = useAuth(); const [, setLocation] = useLocation();
  const query = trpc.fix.approvals.listPending.useQuery(undefined, { enabled: user?.role === "owner" || user?.role === "admin" });
  if (user?.role !== "owner" && user?.role !== "admin") return <AccessRestricted />;
  return <div className="space-y-6"><div><h1 className="text-2xl font-semibold tracking-tight text-[#1d2d23]">Human approval inbox</h1><p className="mt-2 text-sm text-[#738176]">Approve, reject or request changes at every gate. Decisions are checkpointed and never overwritten.</p></div>{query.isLoading ? <p className="text-sm text-[#718076]">Loading approvals…</p> : (query.data?.length ?? 0) === 0 ? <Card className="border-[#dfe7e1]"><CardContent className="grid min-h-72 place-items-center p-6 text-center"><div><div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#eaf2eb] text-[#53805e]"><CheckCircle2 className="h-6 w-6" /></div><p className="mt-4 font-medium text-[#2b3e31]">No pending approvals</p><p className="mt-2 text-sm text-[#7c8b81]">Sensitive actions will be routed here before Fix can move forward.</p></div></CardContent></Card> : <div className="grid gap-4">{query.data?.map(gate => <Card className="border-[#dfe7e1]" key={gate.publicId}><CardContent className="p-5"><div className="flex flex-col justify-between gap-5 lg:flex-row"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><StatusBadge status={gate.project.status} /><span className={`inline-flex items-center gap-1 text-xs font-semibold ${gate.gateType === "high_risk_escalation" ? "text-red-600" : "text-amber-700"}`}>{gate.gateType === "high_risk_escalation" ? <ShieldAlert className="h-3.5 w-3.5" /> : <CircleAlert className="h-3.5 w-3.5" />}{gate.gateType.replaceAll("_", " ")}</span></div><button onClick={() => setLocation(`/projects/${gate.project.publicId}`)} className="mt-4 text-base font-semibold text-[#25372b] hover:underline">{gate.title}</button><p className="mt-1 text-sm font-medium text-[#587061]">{gate.project.title}</p><p className="mt-3 max-w-3xl text-sm leading-6 text-[#6e7e73]">{gate.summary}</p><p className="mt-4 text-xs text-[#9aa79f]">Requested by {gate.requestedByRole} · {formatDate(gate.createdAt)}</p></div><div className="shrink-0 lg:w-72"><ApprovalActions gatePublicId={gate.publicId} /></div></div></CardContent></Card>)}</div>}</div>;
}
