import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export function NewProjectDialog({ compact = false }: { compact?: boolean }) {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [budget, setBudget] = useState("");
  const create = trpc.fix.projects.create.useMutation({
    onSuccess: async data => {
      await Promise.all([utils.fix.dashboard.invalidate(), utils.fix.projects.list.invalidate()]);
      setOpen(false);
      toast.success("Project registered in the Fix pipeline.");
      setLocation(`/projects/${data.project.publicId}`);
    },
    onError: error => toast.error(error.message),
  });

  function submit(event: React.FormEvent) {
    event.preventDefault();
    create.mutate({
      title,
      description,
      clientName: clientName || undefined,
      clientEmail: clientEmail || undefined,
      budgetCents: Math.round((Number(budget) || 0) * 100),
      currency: "USD",
    });
  }

  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild><Button className="bg-[#1d3024] text-white hover:bg-[#2a4432]"><Plus className="mr-2 h-4 w-4" />{compact ? "New project" : "Register an opportunity"}</Button></DialogTrigger>
    <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
      <DialogHeader><DialogTitle>Register an opportunity</DialogTitle><DialogDescription>Creates a persistent project record and its first Manager triage task. This action is reversible and does not contact a client.</DialogDescription></DialogHeader>
      <form onSubmit={submit} className="mt-3 space-y-4">
        <div className="space-y-2"><Label htmlFor="project-title">Project title</Label><Input id="project-title" value={title} onChange={event => setTitle(event.target.value)} placeholder="e.g. AI support automation" required minLength={4} /></div>
        <div className="space-y-2"><Label htmlFor="project-description">Opportunity description</Label><Textarea id="project-description" value={description} onChange={event => setDescription(event.target.value)} placeholder="Scope, business context, requirements and evidence…" required minLength={12} className="min-h-32" /></div>
        <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="client-name">Client name</Label><Input id="client-name" value={clientName} onChange={event => setClientName(event.target.value)} placeholder="Optional" /></div><div className="space-y-2"><Label htmlFor="budget">Budget (USD)</Label><Input id="budget" inputMode="decimal" value={budget} onChange={event => setBudget(event.target.value)} placeholder="0" /></div></div>
        <div className="space-y-2"><Label htmlFor="client-email">Client email</Label><Input id="client-email" type="email" value={clientEmail} onChange={event => setClientEmail(event.target.value)} placeholder="Optional" /></div>
        <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" disabled={create.isPending}>{create.isPending ? "Registering…" : "Create project"}</Button></div>
      </form>
    </DialogContent>
  </Dialog>;
}
