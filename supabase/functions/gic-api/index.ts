import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { Buffer } from "node:buffer";
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "apikey, content-type, x-gic-token",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Content-Type": "application/json",
};
const rawDb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false, autoRefreshToken: false } });
const db = new Proxy(rawDb, {
  get(target, property, receiver) {
    if (property === "from") return (table: string) => target.from(`gic_${table}`);
    return Reflect.get(target, property, receiver);
  },
}) as any;
const roles = new Set(["Lead Architect", "Manager", "Scout", "Proposal", "Backend Team", "AI/Automation Team", "QA/Security Agent", "Delivery Manager"]);
const statuses = new Set(["OPPORTUNITY", "ANALYSIS", "PROPOSAL_DRAFT", "AWAITING_PROPOSAL_APPROVAL", "CLIENT_RESPONSE", "PLANNING", "EXECUTING", "QA_GATE", "AWAITING_DELIVERY_APPROVAL", "DELIVERED", "ON_HOLD", "FAILED", "CANCELLED"]);

function json(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: cors }); }
function tokenHash(value: string) { return createHash("sha256").update(value).digest("hex"); }
function publicId(prefix: string) { return `${prefix}_${randomBytes(7).toString("hex")}`; }
function sessionToken(req: Request) { return req.headers.get("x-gic-token") ?? ""; }
function verify(value: string, stored: string) { const [algorithm, salt, key] = stored.split("$"); if (algorithm !== "scrypt" || !salt || !key) return false; const received = Buffer.from(scryptSync(value, salt, 64).toString("hex"), "hex"); const expected = Buffer.from(key, "hex"); return expected.length === received.length && timingSafeEqual(expected, received); }
async function operator(req: Request) {
  const token = sessionToken(req); if (!token) return null;
  const { data: session } = await db.from("operator_sessions").select("token_hash").eq("token_hash", tokenHash(token)).gt("expires_at", new Date().toISOString()).maybeSingle();
  if (!session) return null;
  const { data: config } = await db.from("operator_config").select("user_id").limit(1).maybeSingle();
  if (!config) return null;
  const { data: user } = await db.from("users").select("id, display_name, role").eq("id", config.user_id).maybeSingle();
  return user ?? null;
}
async function requireOperator(req: Request) { const user = await operator(req); if (!user) throw new Error("UNAUTHORIZED"); return user; }
function isOwner(user: any) { return user.role === "owner" || user.role === "admin"; }
function errorStatus(error: unknown) { return error instanceof Error && error.message === "UNAUTHORIZED" ? 401 : 400; }
function date(value: unknown) { if (!value) return null; const parsed = new Date(String(value)); return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : null; }

async function dashboard() {
  const [{ data: projects }, { data: approvals }, { data: runs }, { data: events }] = await Promise.all([
    db.from("projects").select("*").order("updated_at", { ascending: false }),
    db.from("approval_gates").select("*").eq("status", "pending").order("created_at", { ascending: false }),
    db.from("agent_runs").select("*").order("created_at", { ascending: false }).limit(12),
    db.from("project_events").select("*").order("created_at", { ascending: false }).limit(12),
  ]);
  const rows = projects ?? [];
  const active = rows.filter((project: any) => !["DELIVERED", "FAILED", "CANCELLED"].includes(project.status)).length;
  const delivered = rows.filter((project: any) => project.status === "DELIVERED").length;
  const projectById = Object.fromEntries(rows.map((project: any) => [project.id, { public_id: project.public_id, title: project.title }]));
  const approvalsWithProject = (approvals ?? []).map((approval: any) => ({ ...approval, project: projectById[approval.project_id] ?? null }));
  return {
    metrics: { activeProjects: active, pendingApprovals: approvalsWithProject.length, revenueCents: rows.reduce((sum: number, project: any) => sum + Number(project.budget_cents ?? 0), 0), averageMatchScore: 0, completionRate: rows.length ? Math.round((delivered / rows.length) * 100) : 0, completedProjects: delivered },
    projects: rows, pendingApprovals: approvalsWithProject, recentRuns: runs ?? [], recentEvents: events ?? [],
  };
}

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const url = new URL(req.url); const action = url.searchParams.get("action") ?? ""; const body = req.method === "GET" ? {} : await req.json().catch(() => ({}));
    if (action === "login" && req.method === "POST") {
      const { data, error } = await db.from("operator_config").select("identifier,password_hash").eq("identifier", String(body.identifier ?? "").trim()).maybeSingle();
      if (error) throw new Error(error.message); if (!data || typeof body.password !== "string" || !verify(body.password, data.password_hash)) return json({ error: "INVALID_CREDENTIALS" }, 401);
      const token = randomBytes(32).toString("base64url"); const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();
      const { error: insertError } = await db.from("operator_sessions").insert({ token_hash: tokenHash(token), expires_at: expiresAt }); if (insertError) throw new Error(insertError.message);
      return json({ token, expiresAt });
    }
    if (action === "session") { const user = await operator(req); return json({ authenticated: Boolean(user), user: user ? { id: user.id, name: user.display_name, role: user.role } : null }); }
    if (action === "logout" && req.method === "POST") { const token = sessionToken(req); if (token) await db.from("operator_sessions").delete().eq("token_hash", tokenHash(token)); return json({ success: true }); }

    const user = await requireOperator(req);
    if (action === "dashboard") return json({ dashboard: await dashboard() });
    if (action === "projects.list") { const { data, error } = await db.from("projects").select("*").order("updated_at", { ascending: false }); if (error) throw new Error(error.message); return json({ projects: data ?? [] }); }
    if (action === "projects.detail") { const id = url.searchParams.get("publicId") ?? ""; const { data: project, error } = await db.from("projects").select("*").eq("public_id", id).maybeSingle(); if (error || !project) return json({ error: "PROJECT_NOT_FOUND" }, 404); const [{ data: tasks }, { data: runs }, { data: gates }, { data: events }, { data: actions }] = await Promise.all([db.from("project_tasks").select("*").eq("project_id", project.id), db.from("agent_runs").select("*").eq("project_id", project.id), db.from("approval_gates").select("*").eq("project_id", project.id), db.from("project_events").select("*").eq("project_id", project.id).order("created_at", { ascending: false }), db.from("web_actions").select("*").eq("project_id", project.id)]); return json({ project, tasks: tasks ?? [], runs: runs ?? [], approvals: gates ?? [], events: events ?? [], webActions: actions ?? [] }); }
    if (action === "projects.create" && req.method === "POST") { if (!isOwner(user)) throw new Error("UNAUTHORIZED"); if (typeof body.title !== "string" || body.title.trim().length < 4 || typeof body.description !== "string" || body.description.trim().length < 12) return json({ error: "INVALID_PROJECT" }, 400); const record = { public_id: publicId("prj"), title: body.title.trim(), description: body.description.trim(), client_name: typeof body.clientName === "string" ? body.clientName.trim() || null : null, client_email: typeof body.clientEmail === "string" ? body.clientEmail.trim() || null : null, budget_cents: Number.isInteger(body.budgetCents) && body.budgetCents >= 0 ? body.budgetCents : 0, currency: typeof body.currency === "string" ? body.currency.slice(0, 8) : "USD", deadline_at: date(body.deadlineAt), created_by: user.id }; const { data, error } = await db.from("projects").insert(record).select().single(); if (error) throw new Error(error.message); await db.from("project_events").insert({ public_id: publicId("evt"), project_id: data.id, event_type: "project_created", actor_type: "operator", actor_user_id: user.id, title: "Project created", detail: data.title }); return json({ project: data }); }
    if (action === "projects.transition" && req.method === "POST") { if (!isOwner(user) || !statuses.has(body.toStatus)) return json({ error: "INVALID_TRANSITION" }, 400); const { data: project } = await db.from("projects").select("id,title").eq("public_id", body.projectPublicId).single(); const { data, error } = await db.from("projects").update({ status: body.toStatus, updated_at: new Date().toISOString() }).eq("id", project.id).select().single(); if (error) throw new Error(error.message); await db.from("project_events").insert({ public_id: publicId("evt"), project_id: project.id, event_type: "status_changed", actor_type: "operator", actor_user_id: user.id, title: `Status: ${body.toStatus}`, detail: typeof body.reason === "string" ? body.reason.slice(0, 2000) : "" }); return json({ project: data }); }
    if (action === "projects.resume" && req.method === "POST") { if (!isOwner(user)) throw new Error("UNAUTHORIZED"); const { data: project } = await db.from("projects").select("id").eq("public_id", body.projectPublicId).single(); const { data, error } = await db.from("projects").update({ status: "PLANNING", updated_at: new Date().toISOString() }).eq("id", project.id).select().single(); if (error) throw new Error(error.message); return json({ project: data }); }
    if (action === "projects.report") { const { data: project } = await db.from("projects").select("*").eq("public_id", url.searchParams.get("publicId") ?? "").single(); if (!project) return json({ error: "PROJECT_NOT_FOUND" }, 404); return json({ content: `# ${project.title}\n\n**Status:** ${project.status}\n\n${project.description}\n\nGenerated from the independent GIC project record.` }); }
    if (action === "approvals.list") { const { data, error } = await db.from("approval_gates").select("*").eq("status", "pending").order("created_at", { ascending: false }); if (error) throw new Error(error.message); return json({ approvals: data ?? [] }); }
    if (action === "approvals.request" && req.method === "POST") { if (!isOwner(user) || !roles.has(body.requestedByRole)) return json({ error: "INVALID_APPROVAL" }, 400); const { data: project } = await db.from("projects").select("id").eq("public_id", body.projectPublicId).single(); const { data, error } = await db.from("approval_gates").insert({ public_id: publicId("apr"), project_id: project.id, gate_type: String(body.gateType ?? "high_risk_escalation"), title: String(body.title ?? "Approval").slice(0, 255), summary: String(body.summary ?? "").slice(0, 10000), context_json: body.context ?? {}, requested_by_role: body.requestedByRole }).select().single(); if (error) throw new Error(error.message); return json({ approval: data }); }
    if (action === "approvals.decide" && req.method === "POST") { if (!isOwner(user) || !["approve", "reject", "request-changes"].includes(body.action)) return json({ error: "INVALID_DECISION" }, 400); const { data: gate } = await db.from("approval_gates").select("id").eq("public_id", body.gatePublicId).eq("status", "pending").single(); const now = new Date().toISOString(); const { error } = await db.from("approval_gates").update({ status: "resolved", resolution_action: body.action, resolved_by: user.id, resolved_at: now, updated_at: now }).eq("id", gate.id); if (error) throw new Error(error.message); await db.from("approval_decisions").insert({ approval_gate_id: gate.id, action: body.action, feedback: typeof body.feedback === "string" ? body.feedback.slice(0, 10000) : null, decided_by: user.id }); return json({ success: true }); }
    if (action === "agents.run" && req.method === "POST") { if (!isOwner(user) || !roles.has(body.role)) return json({ error: "INVALID_AGENT_REQUEST" }, 400); const { data: project } = await db.from("projects").select("id").eq("public_id", body.projectPublicId).single(); const { data, error } = await db.from("agent_runs").insert({ public_id: publicId("run"), project_id: project.id, role: body.role, status: "completed", input_summary: "Operator-created independent run record", output_summary: "No provider credential is configured. The request was recorded without external execution." }).select().single(); if (error) throw new Error(error.message); return json({ run: data, message: "Run recorded without external execution." }); }
    if (["agents.plan", "agents.workstreams", "agents.quality", "workspace.simulate"].includes(action) && req.method === "POST") { const { data: project } = await db.from("projects").select("id").eq("public_id", body.projectPublicId).maybeSingle(); if (project) await db.from("project_events").insert({ public_id: publicId("evt"), project_id: project.id, event_type: "operator_request_recorded", actor_type: "operator", actor_user_id: user.id, title: "Independent operator request recorded", detail: "No external provider execution was performed." }); return json({ completedTaskCount: 0, message: "Request recorded. Configure an independent provider before enabling external execution." }); }
    if (action === "activity") { const { data, error } = await db.from("project_events").select("*").order("created_at", { ascending: false }).limit(80); if (error) throw new Error(error.message); return json({ events: data ?? [] }); }
    if (action === "notifications") { const { data, error } = await db.from("notifications").select("*").eq("recipient_id", user.id).order("created_at", { ascending: false }).limit(80); if (error) throw new Error(error.message); return json({ notifications: data ?? [] }); }
    if (action === "sites.list") { const { data, error } = await db.from("site_profiles").select("*").eq("owner_id", user.id).order("created_at", { ascending: false }); if (error) throw new Error(error.message); return json({ sites: data ?? [] }); }
    if (action === "sites.create" && req.method === "POST") { if (!isOwner(user) || typeof body.name !== "string" || typeof body.baseUrl !== "string") return json({ error: "INVALID_SITE" }, 400); const parsed = new URL(body.baseUrl); const { data, error } = await db.from("site_profiles").insert({ public_id: publicId("site"), owner_id: user.id, name: body.name.trim().slice(0, 255), base_url: parsed.toString(), connection_mode: ["api", "browser", "hybrid"].includes(body.connectionMode) ? body.connectionMode : "hybrid", allowed_paths: Array.isArray(body.allowedPaths) ? body.allowedPaths.slice(0, 30) : [] }).select().single(); if (error) throw new Error(error.message); return json({ site: data }); }
    if (action === "sites.status" && req.method === "POST") { if (!isOwner(user)) throw new Error("UNAUTHORIZED"); const { data, error } = await db.from("site_profiles").update({ status: body.status, updated_at: new Date().toISOString() }).eq("public_id", body.sitePublicId).eq("owner_id", user.id).select().single(); if (error) throw new Error(error.message); return json({ site: data }); }
    if (action === "provider-models.list") { const { data, error } = await db.from("provider_models").select("*").order("provider"); if (error) throw new Error(error.message); return json({ models: data ?? [] }); }
    if (action === "provider-models.add" && req.method === "POST") { if (!isOwner(user) || typeof body.provider !== "string" || typeof body.modelName !== "string") return json({ error: "INVALID_MODEL" }, 400); const { data, error } = await db.from("provider_models").upsert({ provider: body.provider.trim(), model_name: body.modelName.trim(), tier: typeof body.tier === "string" ? body.tier.trim() : "standard" }, { onConflict: "provider,model_name" }).select().single(); if (error) throw new Error(error.message); return json({ model: data }); }
    if (action === "provider-models.toggle" && req.method === "POST") { if (!isOwner(user)) throw new Error("UNAUTHORIZED"); const { data, error } = await db.from("provider_models").update({ enabled: Boolean(body.enabled) }).eq("id", body.id).select().single(); if (error) throw new Error(error.message); return json({ model: data }); }
    if (action === "provider-models.delete" && req.method === "DELETE") { if (!isOwner(user)) throw new Error("UNAUTHORIZED"); const { error } = await db.from("provider_models").delete().eq("id", body.id); if (error) throw new Error(error.message); return json({ success: true }); }
    if (action === "provider-status") { const { data } = await db.from("provider_credentials").select("provider,label,last_four,updated_at").order("provider"); return json({ providers: data ?? [] }); }
    if (action === "telegram.pairings") { const { data, error } = await db.from("telegram_pairings").select("*").eq("user_id", user.id).order("created_at", { ascending: false }); if (error) throw new Error(error.message); return json({ pairings: data ?? [] }); }
    if (action === "telegram.generate-pairing" && req.method === "POST") { const code = randomBytes(4).toString("hex").toUpperCase(); const expires = new Date(Date.now() + 15 * 60 * 1000).toISOString(); const { data, error } = await db.from("telegram_pairings").insert({ public_id: publicId("tg"), user_id: user.id, role_snapshot: user.role, pairing_code_hash: tokenHash(code), pairing_expires_at: expires }).select().single(); if (error) throw new Error(error.message); return json({ pairing: { ...data, pairingCode: code } }); }
    if (action === "telegram.revoke-pairing" && req.method === "POST") { const { data, error } = await db.from("telegram_pairings").update({ status: "revoked", revoked_at: new Date().toISOString() }).eq("public_id", body.pairingPublicId).eq("user_id", user.id).select().single(); if (error) throw new Error(error.message); return json({ pairing: data }); }
    if (action === "telegram.preferences") { const { data, error } = await db.from("telegram_preferences").select("*").eq("user_id", user.id).maybeSingle(); if (error) throw new Error(error.message); return json({ preference: data ?? { user_id: user.id, locale: "fa", daily_digest_enabled: false, daily_digest_hour_iran: 9, daily_digest_minute_iran: 0 } }); }
    if (action === "telegram.update-preferences" && req.method === "PATCH") { const { data, error } = await db.from("telegram_preferences").upsert({ user_id: user.id, locale: body.locale === "en" ? "en" : "fa", daily_digest_enabled: Boolean(body.dailyDigestEnabled), daily_digest_hour_iran: Number.isInteger(body.hourIran) ? body.hourIran : 9, daily_digest_minute_iran: body.minuteIran === 30 ? 30 : 0, updated_at: new Date().toISOString() }).select().single(); if (error) throw new Error(error.message); return json({ preference: data }); }
    return json({ error: "NOT_FOUND" }, 404);
  } catch (error) { return json({ error: error instanceof Error ? error.message : "REQUEST_FAILED" }, errorStatus(error)); }
});
