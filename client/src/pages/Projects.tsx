import AccessRestricted from "@/pages/AccessRestricted";
import { NewProjectDialog } from "@/components/fix/NewProjectDialog";
import { StatusBadge } from "@/components/fix/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/format";
import { trpc } from "@/lib/trpc";
import { ArrowUpRight, FolderKanban } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";

export default function Projects() {
  const { user } = useAuth(); const [, setLocation] = useLocation();
  const query = trpc.fix.projects.list.useQuery(undefined, { enabled: user?.role === "owner" || user?.role === "admin" });
  if (user?.role !== "owner" && user?.role !== "admin") return <AccessRestricted />;
  return <div className="space-y-6"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><h1 className="text-2xl font-semibold tracking-tight text-[#1d2d23]">Project registry</h1><p className="mt-2 text-sm text-[#738176]">A complete operating record for every engagement and opportunity.</p></div><NewProjectDialog compact /></div><Card className="overflow-hidden border-[#dfe7e1]"><CardContent className="p-0">{query.isLoading ? <p className="p-6 text-sm text-[#718076]">Loading projects…</p> : (query.data?.length ?? 0) === 0 ? <div className="grid min-h-72 place-items-center text-center"><div><FolderKanban className="mx-auto h-7 w-7 text-[#73957c]" /><p className="mt-3 text-sm font-medium text-[#34483a]">No project record exists yet.</p></div></div> : <div className="divide-y divide-[#ebf0ec]">{query.data?.map(project => <button onClick={() => setLocation(`/projects/${project.publicId}`)} key={project.publicId} className="grid w-full grid-cols-[minmax(0,1fr)_auto] gap-5 px-5 py-4 text-left transition hover:bg-[#f7faf7] lg:grid-cols-[minmax(0,1fr)_150px_135px_155px_28px]"><div className="min-w-0"><p className="truncate text-sm font-semibold text-[#26382c]">{project.title}</p><p className="mt-1 truncate text-xs text-[#7e8b82]">{project.clientName || "Client not yet recorded"} · {project.publicId}</p></div><div className="hidden text-xs text-[#748278] lg:block">{formatCurrency(project.budgetCents, project.currency)}</div><div className="hidden text-xs text-[#748278] lg:block">{project.matchScore === null ? "Unscored" : `${project.matchScore}% match`}</div><div className="hidden lg:block"><StatusBadge status={project.status} /></div><div className="flex items-center gap-3 lg:hidden"><StatusBadge status={project.status} /><span className="text-[10px] text-[#8a988f]">{formatDate(project.updatedAt)}</span></div><ArrowUpRight className="h-4 w-4 self-center text-[#90a097]" /></button>)}</div>}</CardContent></Card></div>;
}
