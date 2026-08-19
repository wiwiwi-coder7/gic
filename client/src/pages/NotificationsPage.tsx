import AccessRestricted from "@/pages/AccessRestricted";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import { trpc } from "@/lib/trpc";
import { BellRing } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";

export default function NotificationsPage() {
  const { user } = useAuth(); const [, setLocation] = useLocation();
  const query = trpc.fix.notifications.useQuery(undefined, { enabled: user?.role === "owner" || user?.role === "admin" });
  if (user?.role !== "owner" && user?.role !== "admin") return <AccessRestricted />;
  return <div className="space-y-6"><div><h1 className="text-2xl font-semibold tracking-tight text-[#1d2d23]">Notifications</h1><p className="mt-2 text-sm text-[#738176]">Persistent internal alerts for approval requests, escalations and lifecycle events.</p></div><Card className="border-[#dfe7e1]"><CardContent className="p-0">{query.isLoading ? <p className="p-6 text-sm text-[#718076]">Loading notifications…</p> : (query.data?.length ?? 0) === 0 ? <div className="grid min-h-72 place-items-center text-center"><div><BellRing className="mx-auto h-7 w-7 text-[#73957c]" /><p className="mt-3 text-sm font-medium text-[#34483a]">No notification has been created.</p></div></div> : <div className="divide-y divide-[#eaf0eb]">{query.data?.map(item => <button key={item.publicId} onClick={() => item.actionUrl && setLocation(item.actionUrl)} className="w-full px-5 py-4 text-left transition hover:bg-[#f7faf7]"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold text-[#35483b]">{item.title}</p><div className="flex items-center gap-2"><Badge variant="outline" className="capitalize">{item.severity}</Badge><span className="text-[10px] text-[#89978e]">{formatDate(item.createdAt)}</span></div></div><p className="mt-2 text-xs leading-5 text-[#728177]">{item.body}</p></button>)}</div>}</CardContent></Card></div>;
}
