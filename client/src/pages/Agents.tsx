import AccessRestricted from "@/pages/AccessRestricted";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Bot, CheckCircle2, LockKeyhole } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

export default function Agents() {
  const { user } = useAuth();
  const skills = trpc.fix.agents.skills.useQuery(undefined, { enabled: user?.role === "owner" || user?.role === "admin" });
  if (user?.role !== "owner" && user?.role !== "admin") return <AccessRestricted />;
  return <div className="space-y-6"><div><h1 className="text-2xl font-semibold tracking-tight text-[#1d2d23]">Agent operations</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-[#738176]">Fix uses specialized roles with explicit skills, structured contracts and limitations. Agents can recommend and prepare work; sensitive actions remain in the human approval inbox.</p></div><div className="grid gap-4 xl:grid-cols-2">{skills.isLoading ? <p className="text-sm text-[#718076]">Loading skill definitions…</p> : skills.data?.map(skill => <Card className="border-[#dfe7e1]" key={skill.name}><CardContent className="p-5"><div className="flex items-start justify-between gap-4"><div className="min-w-0"><div className="flex items-center gap-2"><div className="grid h-9 w-9 place-items-center rounded-xl bg-[#eaf3eb] text-[#3e714d]"><Bot className="h-4 w-4" /></div><h2 className="text-sm font-semibold text-[#27392d]">{skill.name}</h2></div><p className="mt-4 text-sm leading-6 text-[#718076]">{skill.purpose}</p></div><Badge variant="outline" className="shrink-0">{skill.allowedRoles.length} roles</Badge></div><div className="mt-5 grid gap-4 sm:grid-cols-2"><div><p className="text-[10px] font-semibold uppercase tracking-[.12em] text-[#7b8c80]">Workflow</p><ol className="mt-2 space-y-1 text-xs leading-5 text-[#64756a]">{skill.workflow.map((step, index) => <li key={step}>{index + 1}. {step}</li>)}</ol></div><div><p className="text-[10px] font-semibold uppercase tracking-[.12em] text-[#7b8c80]">Validation</p><div className="mt-2 space-y-1.5">{skill.validationChecks.map(check => <p className="flex gap-1.5 text-xs text-[#64756a]" key={check}><CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-[#6da940]" />{check}</p>)}</div></div></div><div className="mt-5 rounded-xl bg-[#f3f7f4] p-3"><p className="flex gap-2 text-xs leading-5 text-[#65786b]"><LockKeyhole className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#597660]" />{skill.guardrails[0]}</p></div></CardContent></Card>)}</div></div>;
}
