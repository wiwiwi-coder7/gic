import AccessRestricted from "@/pages/AccessRestricted";
import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Cable, ChevronRight, CirclePause, Globe2, Plus, ShieldCheck, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type ConnectionMode = "api" | "browser" | "hybrid";

const statusTone: Record<string, string> = {
  draft: "border-slate-300 bg-slate-100 text-slate-700",
  active: "border-emerald-200 bg-emerald-50 text-emerald-700",
  paused: "border-amber-200 bg-amber-50 text-amber-700",
  revoked: "border-rose-200 bg-rose-50 text-rose-700",
};

export default function SitesPage() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const profiles = trpc.fix.sites.list.useQuery(undefined, { enabled: user?.role === "owner" || user?.role === "admin" });
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [connectionMode, setConnectionMode] = useState<ConnectionMode>("hybrid");
  const [allowedPaths, setAllowedPaths] = useState("/");
  const [apiSecretReference, setApiSecretReference] = useState("");
  const [browserSessionLabel, setBrowserSessionLabel] = useState("");

  const create = trpc.fix.sites.create.useMutation({
    onSuccess: () => {
      void utils.fix.sites.list.invalidate();
      setOpen(false);
      setName(""); setBaseUrl(""); setAllowedPaths("/"); setApiSecretReference(""); setBrowserSessionLabel(""); setConnectionMode("hybrid");
      toast.success("Site Profile created as a protected draft.");
    },
    onError: error => toast.error(error.message),
  });
  const setStatus = trpc.fix.sites.setStatus.useMutation({
    onSuccess: () => { void utils.fix.sites.list.invalidate(); toast.success("Site Profile status updated."); },
    onError: error => toast.error(error.message),
  });

  if (user?.role !== "owner" && user?.role !== "admin") return <AccessRestricted />;

  const submit = () => {
    const paths = allowedPaths.split(/[\n,]/).map(path => path.trim()).filter(Boolean);
    if (!name.trim() || !baseUrl.trim() || paths.length === 0) {
      toast.error("Name, base URL and at least one allowed path are required.");
      return;
    }
    create.mutate({
      name: name.trim(), baseUrl: baseUrl.trim(), connectionMode, allowedPaths: paths,
      apiSecretReference: apiSecretReference.trim() || undefined,
      browserSessionLabel: browserSessionLabel.trim() || undefined,
    });
  };

  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5d826c]">External operations</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#1d2d23]">Authorized sites</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[#738176]">Every website is explicitly registered, path-restricted and audit-bound. A public, read-only Site Profile can run one approved request without a browser session; login and external submit remain blocked.</p></div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild><Button className="bg-[#1d3c2b] text-white hover:bg-[#244c36]"><Plus className="mr-2 h-4 w-4" />Add site</Button></DialogTrigger>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl"><DialogHeader><DialogTitle>Add an authorized Site Profile</DialogTitle><DialogDescription>Fix can read and prepare drafts within your allowlist. Any final submit action always creates a human approval gate.</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-2"><div className="grid gap-2"><Label htmlFor="site-name">Site name</Label><Input id="site-name" value={name} onChange={event => setName(event.target.value)} placeholder="Client portal" /></div><div className="grid gap-2"><Label htmlFor="site-url">Base URL</Label><Input id="site-url" value={baseUrl} onChange={event => setBaseUrl(event.target.value)} placeholder="https://portal.example.com" /></div><div className="grid gap-2"><Label>Connection policy</Label><Select value={connectionMode} onValueChange={value => setConnectionMode(value as ConnectionMode)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="hybrid">Hybrid — API first, browser fallback</SelectItem><SelectItem value="api">API only</SelectItem><SelectItem value="browser">Approved browser session only</SelectItem></SelectContent></Select></div><div className="grid gap-2"><Label htmlFor="site-paths">Allowed paths</Label><Textarea id="site-paths" value={allowedPaths} onChange={event => setAllowedPaths(event.target.value)} placeholder={'/jobs\n/messages'} /><p className="text-xs text-muted-foreground">One path prefix per line. The root path <code>/</code> permits the whole site.</p></div><div className="grid gap-2"><Label htmlFor="site-api">API secret reference <span className="font-normal text-muted-foreground">(optional reference only)</span></Label><Input id="site-api" value={apiSecretReference} onChange={event => setApiSecretReference(event.target.value)} placeholder="CLIENT_PORTAL_API_KEY" /></div><div className="grid gap-2"><Label htmlFor="site-browser">Browser session label <span className="font-normal text-muted-foreground">(optional)</span></Label><Input id="site-browser" value={browserSessionLabel} onChange={event => setBrowserSessionLabel(event.target.value)} placeholder="client-portal-owner-session" /></div></div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button disabled={create.isPending} onClick={submit} className="bg-[#1d3c2b] text-white hover:bg-[#244c36]">{create.isPending ? "Creating…" : "Create protected draft"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    <Card className="border-[#dfe7e1] bg-[#f8fbf8]"><CardContent className="flex gap-3 p-4 text-sm text-[#587063]"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#3c754d]" /><p><strong className="text-[#2c4536]">Level B policy:</strong> read, fill draft and prepare message are staged and logged; submit is never automatic. An approval decision changes a staged action to approved but does not bypass execution controls.</p></CardContent></Card>
    <div className="grid gap-4 xl:grid-cols-2">{profiles.isLoading ? <Card className="border-[#dfe7e1]"><CardContent className="p-6 text-sm text-[#738176]">Loading Site Profiles…</CardContent></Card> : profiles.data?.length ? profiles.data.map(profile => <Card key={profile.publicId} className="border-[#dfe7e1] shadow-sm"><CardContent className="p-5"><div className="flex items-start justify-between gap-4"><div className="min-w-0"><div className="flex items-center gap-2"><div className="grid h-9 w-9 place-items-center rounded-xl bg-[#eaf3eb] text-[#3c754d]"><Globe2 className="h-4 w-4" /></div><div><h2 className="truncate text-sm font-semibold text-[#263a2d]">{profile.name}</h2><p className="mt-0.5 truncate text-xs text-[#718076]">{profile.baseUrl}</p></div></div></div><Badge variant="outline" className={statusTone[profile.status]}>{profile.status}</Badge></div><div className="mt-5 grid gap-3 text-xs text-[#66786c] sm:grid-cols-2"><div className="rounded-xl bg-[#f5f8f5] p-3"><p className="font-medium text-[#405447]">Connection</p><p className="mt-1 flex items-center gap-1.5"><Cable className="h-3.5 w-3.5" />{profile.connectionMode === "hybrid" ? "API first · browser fallback" : profile.connectionMode}</p></div><div className="rounded-xl bg-[#f5f8f5] p-3"><p className="font-medium text-[#405447]">Allowed paths</p><p className="mt-1 truncate">{(profile.allowedPaths as string[]).join(" · ")}</p></div></div><div className="mt-5 flex flex-wrap gap-2">{profile.status === "draft" && <Button size="sm" onClick={() => setStatus.mutate({ sitePublicId: profile.publicId, status: "active" })} disabled={setStatus.isPending} className="bg-[#1d3c2b] text-white hover:bg-[#244c36]"><ShieldCheck className="mr-1.5 h-3.5 w-3.5" />Activate</Button>}{profile.status === "active" && <Button size="sm" variant="outline" onClick={() => setStatus.mutate({ sitePublicId: profile.publicId, status: "paused" })} disabled={setStatus.isPending}><CirclePause className="mr-1.5 h-3.5 w-3.5" />Pause</Button>}{profile.status === "paused" && <Button size="sm" onClick={() => setStatus.mutate({ sitePublicId: profile.publicId, status: "active" })} disabled={setStatus.isPending} className="bg-[#1d3c2b] text-white hover:bg-[#244c36]"><ChevronRight className="mr-1.5 h-3.5 w-3.5" />Resume</Button>}{profile.status !== "revoked" && <Button size="sm" variant="ghost" className="text-rose-700 hover:bg-rose-50 hover:text-rose-800" onClick={() => setStatus.mutate({ sitePublicId: profile.publicId, status: "revoked" })} disabled={setStatus.isPending}>Revoke</Button>}</div></CardContent></Card>) : <Card className="border-dashed border-[#cddbd1] bg-white"><CardContent className="flex flex-col items-center px-6 py-14 text-center"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#eff6ef] text-[#477a56]"><TriangleAlert className="h-5 w-5" /></div><h2 className="mt-4 text-sm font-semibold text-[#314739]">No sites are authorized yet</h2><p className="mt-2 max-w-md text-sm leading-6 text-[#738176]">Register a site, set its exact paths and choose its connection policy before an agent can prepare any work for it.</p></CardContent></Card>}</div>
  </div>;
}
