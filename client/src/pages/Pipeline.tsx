import AccessRestricted from "@/pages/AccessRestricted";
import { NewProjectDialog } from "@/components/fix/NewProjectDialog";
import { StatusBadge } from "@/components/fix/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/format";
import { trpc } from "@/lib/trpc";
import { ArrowUpRight, Radar } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";

export default function Pipeline() {
  const { user } = useAuth(); const [, setLocation] = useLocation();
  const query = trpc.fix.projects.list.useQuery(undefined, { enabled: user?.role === "owner" || user?.role === "admin" });
  if (user?.role !== "owner" && user?.role !== "admin") return <AccessRestricted />;
  const groups = new Map<string, NonNullable<typeof query.data>>();
  for (const project of query.data ?? []) { const group = groups.get(project.status) ?? []; group.push(project); groups.set(project.status, group); }
  return <div className="space-y-6"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><h1 className="text-2xl font-semibold tracking-tight text-[#1d2d23]">Opportunity pipeline</h1><p className="mt-2 text-sm text-[#738176]">Every record becomes a persistent project only after deliberate intake.</p></div><NewProjectDialog compact /></div>{query.isLoading ? <p className="text-sm text-[#718076]">Loading pipeline…</p> : query.data?.length === 0 ? <Card className="border-[#dfe7e1]"><CardContent className="grid min-h-72 place-items-center p-6 text-center"><div><div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#eaf2eb] text-[#517d5d]"><Radar className="h-6 w-6" /></div><p className="mt-4 font-medium text-[#2b3e31]">The pipeline is ready for its first real opportunity.</p><p className="mt-2 max-w-md text-sm text-[#7c8b81]">Registering an opportunity creates an immutable event and initial checkpoint—nothing is contacted automatically.</p></div></CardContent></Card> : <div className="grid gap-5 xl:grid-cols-3">{Array.from(groups.entries()).map(([status, projects]) => <Card key={status} className="border-[#dfe7e1]"><CardContent className="p-0"><div className="flex items-center justify-between border-b border-[#e7ede8] px-4 py-4"><StatusBadge status={status} /><span className="text-xs text-[#839188]">{projects.length}</span></div><div className="space-y-2 p-3">{projects.map(project => <button key={project.publicId} onClick={() => setLocation(`/projects/${project.publicId}`)} className="w-full rounded-xl border border-[#e3ebe5] bg-white p-4 text-left transition hover:border-[#b7ccb9] hover:shadow-sm"><div className="flex items-start justify-between gap-3"><p className="line-clamp-2 text-sm font-semibold text-[#2c3d31]">{project.title}</p><ArrowUpRight className="h-4 w-4 shrink-0 text-[#89a08e]" /></div><div className="mt-4 flex items-center justify-between text-xs text-[#7b8980]"><span>{formatCurrency(project.budgetCents, project.currency)}</span><span>{project.matchScore === null ? "Unscored" : `${project.matchScore}% match`}</span></div><p className="mt-3 text-[10px] uppercase tracking-wide text-[#9ba89f]">Updated {formatDate(project.updatedAt)}</p></button>)}</div></CardContent></Card>)}</div>}</div>;
}
