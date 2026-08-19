import AccessRestricted from "@/pages/AccessRestricted";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import { trpc } from "@/lib/trpc";
import { Activity } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

export default function ActivityPage() {
  const { user } = useAuth(); const activity = trpc.fix.activity.useQuery(undefined, { enabled: user?.role === "owner" || user?.role === "admin" });
  if (user?.role !== "owner" && user?.role !== "admin") return <AccessRestricted />;
  return <div className="space-y-6"><div><h1 className="text-2xl font-semibold tracking-tight text-[#1d2d23]">Agency activity log</h1><p className="mt-2 text-sm text-[#738176]">A cross-project event record for human actions, lifecycle changes, agent decisions and audited operations.</p></div><Card className="border-[#dfe7e1]"><CardContent className="p-0">{activity.isLoading ? <p className="p-6 text-sm text-[#718076]">Loading activity…</p> : activity.data?.length === 0 ? <div className="grid min-h-72 place-items-center text-center"><div><Activity className="mx-auto h-7 w-7 text-[#73957c]" /><p className="mt-3 text-sm font-medium text-[#34483a]">No agency event exists yet.</p></div></div> : <div className="divide-y divide-[#eaf0eb]">{activity.data?.map(event => <div key={event.publicId} className="flex gap-4 px-5 py-4"><div className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${event.severity === "critical" ? "bg-red-500" : event.severity === "warning" ? "bg-amber-500" : "bg-[#75ae44]"}`} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold text-[#34483a]">{event.title}</p><span className="text-[10px] text-[#89978e]">{formatDate(event.createdAt)}</span></div><p className="mt-1 text-xs leading-5 text-[#738177]">{event.detail}</p><div className="mt-2 flex items-center gap-2"><Badge variant="outline" className="text-[9px] uppercase">{event.actorType}</Badge><span className="text-[10px] text-[#94a198]">{event.eventType}</span></div></div></div>)}</div>}</CardContent></Card></div>;
}
