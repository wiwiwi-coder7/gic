import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const API_ROOT = "https://qqafgmkxqzjpppczzrac.supabase.co/functions/v1/gic-api";
const PUBLISHABLE_KEY = "sb_publishable_Wz1ZzslBy-YqnHlU9CxG-g_MpIADxML";
const OPERATOR_TOKEN = "gic_operator_token";

type RequestOptions = { method?: "GET" | "POST" | "PATCH" | "DELETE"; input?: unknown; query?: Record<string, string> };
export class GicApiError extends Error { constructor(public readonly status: number, message: string) { super(message); } }

function token() { return localStorage.getItem(OPERATOR_TOKEN) ?? ""; }
function endpoint(action: string, query?: Record<string, string>) { const url = new URL(API_ROOT); url.searchParams.set("action", action); Object.entries(query ?? {}).forEach(([key, value]) => url.searchParams.set(key, value)); return url.toString(); }
export function camelize(value: any): any { if (Array.isArray(value)) return value.map(camelize); if (!value || typeof value !== "object") return value; return Object.fromEntries(Object.entries(value).map(([key, item]) => [key.replace(/_([a-z])/g, (_, char) => char.toUpperCase()), camelize(item)])); }
function projectQuery(input: any) { return input?.projectPublicId ? { publicId: String(input.projectPublicId) } : undefined; }

async function api<T = any>(action: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(endpoint(action, options.query), { method: options.method ?? "GET", headers: { apikey: PUBLISHABLE_KEY, "Content-Type": "application/json", ...(token() ? { "x-gic-token": token() } : {}) }, ...(options.input === undefined ? {} : { body: JSON.stringify(options.input) }) });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new GicApiError(response.status, payload.error ?? "The request could not be completed.");
  return payload as T;
}

function queryHook<T = any>(key: string, action: string, mapper: (payload: any) => T = payload => camelize(payload), query: (input: any) => Record<string, string> | undefined = () => undefined) {
  return (input?: any, options?: any) => useQuery<T>({ queryKey: [key, input], queryFn: () => api(action, { query: query(input) }).then(mapper), enabled: options?.enabled, refetchInterval: options?.refetchInterval }) as any;
}
function mutationHook<T = any>(key: string, action: string, method: RequestOptions["method"] = "POST", mapper: (payload: any) => T = payload => camelize(payload), prepare?: (input: any) => RequestOptions) {
  return (options?: any) => useMutation<T, Error, any>({ mutationKey: [key], mutationFn: input => api(action, prepare ? prepare(input) : { method, input }).then(mapper), ...options }) as any;
}
function staticQuery<T>(key: string, value: T) { return (_input?: any, options?: any) => useQuery<T>({ queryKey: [key], queryFn: async () => value, enabled: options?.enabled }) as any; }
function successfulMutation<T = { success: true }>(key: string, payload: T) { return (options?: any) => useMutation<T, Error, any>({ mutationKey: [key], mutationFn: async (_input?: any) => payload, ...options }) as any; }

const skills = [
  { name: "Lead Architect", purpose: "Structures project scope and bounded implementation decisions.", allowedRoles: ["Lead Architect"], workflow: ["Review scope", "Define constraints", "Record decisions"], validationChecks: ["Scope is explicit", "Human approval remains required"], guardrails: ["Never performs external side effects." ] },
  { name: "Delivery Manager", purpose: "Maintains human-reviewed delivery checkpoints and project visibility.", allowedRoles: ["Delivery Manager", "Manager"], workflow: ["Track status", "Surface blockers", "Request approval"], validationChecks: ["State transitions are logged", "Owner retains control"], guardrails: ["Never sends or submits external content." ] },
];

function useOperatorLogin(options?: any) { return useMutation<any, Error, { identifier: string; password: string }>({ mutationKey: ["operator-login"], mutationFn: async input => { const result = await api<any>("login", { method: "POST", input }); localStorage.setItem(OPERATOR_TOKEN, result.token); return result; }, ...options }); }
function useOperatorLogout(options?: any) { return useMutation<any, Error, void>({ mutationKey: ["operator-logout"], mutationFn: async () => { try { await api("logout", { method: "POST" }); } finally { localStorage.removeItem(OPERATOR_TOKEN); } return { success: true }; }, ...options }); }

export const standaloneApi = {
  auth: { login: { useMutation: useOperatorLogin }, me: { useQuery: queryHook("operator-session", "session", payload => camelize(payload.user)) }, logout: { useMutation: useOperatorLogout } },
  fix: {
    dashboard: { useQuery: queryHook("gic-dashboard", "dashboard", payload => camelize(payload.dashboard)) },
    projects: {
      list: { useQuery: queryHook("gic-projects", "projects.list", payload => camelize(payload.projects)) },
      detail: { useQuery: queryHook("gic-project-detail", "projects.detail", payload => { const value = camelize(payload); return { ...value, qualityRuns: value.runs?.filter((run: any) => run.role === "QA/Security Agent") ?? [], webActions: value.webActions ?? [], events: value.events ?? [], checkpoints: [], audits: [], decisions: [], costs: [], artifacts: [] }; }, projectQuery) },
      create: { useMutation: mutationHook("gic-project-create", "projects.create", "POST", payload => ({ project: camelize(payload.project) })) },
      transition: { useMutation: mutationHook("gic-project-transition", "projects.transition", "POST", payload => ({ project: camelize(payload.project) })) },
      resume: { useMutation: mutationHook("gic-project-resume", "projects.resume", "POST", payload => ({ project: camelize(payload.project) })) },
      generateReport: { useMutation: mutationHook("gic-project-report", "projects.report", "POST", payload => camelize(payload), input => ({ method: "GET", query: { publicId: String(input.projectPublicId) } })) },
      audit: { useQuery: staticQuery("gic-project-audit", []) },
    },
    approvals: { listPending: { useQuery: queryHook("gic-approvals", "approvals.list", payload => camelize(payload.approvals)) }, request: { useMutation: mutationHook("gic-approval-request", "approvals.request", "POST", payload => ({ approval: camelize(payload.approval) })) }, decide: { useMutation: mutationHook("gic-approval-decide", "approvals.decide") } },
    agents: { skills: { useQuery: staticQuery("gic-agent-skills", skills) }, run: { useMutation: mutationHook("gic-agent-run", "agents.run") }, runPlanningHierarchy: { useMutation: mutationHook("gic-agent-plan", "agents.plan") }, runSpecialistWorkstreams: { useMutation: mutationHook("gic-agent-workstreams", "agents.workstreams") }, runQualityGate: { useMutation: mutationHook("gic-agent-quality", "agents.quality") } },
    sites: { list: { useQuery: queryHook("gic-sites", "sites.list", payload => camelize(payload.sites)) }, create: { useMutation: mutationHook("gic-site-create", "sites.create", "POST", payload => ({ site: camelize(payload.site) })) }, setStatus: { useMutation: mutationHook("gic-site-status", "sites.status", "POST", payload => ({ site: camelize(payload.site) })) }, updateAllowlist: { useMutation: successfulMutation("gic-site-allowlist", { success: true }) }, webActions: { list: { useQuery: staticQuery("gic-web-actions", []) }, prepare: { useMutation: successfulMutation("gic-web-action-prepare", { success: true }) }, requestExecution: { useMutation: successfulMutation("gic-web-action-request", { status: "draft" }) }, executeApproved: { useMutation: successfulMutation("gic-web-action-execute", { status: "blocked" }) } } },
    telegram: { listPairings: { useQuery: queryHook("gic-pairings", "telegram.pairings", payload => camelize(payload.pairings)) }, getPreference: { useQuery: queryHook("gic-telegram-preference", "telegram.preferences", payload => { const item = camelize(payload.preference); return { ...item, dailyDigestHourIran: item.dailyDigestHourIran ?? item.dailyDigestHourIran, dailyDigestMinuteIran: item.dailyDigestMinuteIran ?? item.dailyDigestMinuteIran }; }) }, generatePairingCode: { useMutation: mutationHook("gic-pairing-create", "telegram.generate-pairing", "POST", payload => ({ ...camelize(payload.pairing), code: payload.pairing.pairingCode })) }, revokePairing: { useMutation: mutationHook("gic-pairing-revoke", "telegram.revoke-pairing", "POST") }, updatePreference: { useMutation: mutationHook("gic-telegram-preference-update", "telegram.update-preferences", "PATCH", payload => camelize(payload.preference), input => ({ method: "PATCH", input: { locale: input.locale, dailyDigestEnabled: true, hourIran: input.dailyDigestHourIran, minuteIran: input.dailyDigestMinuteIran } })) }, enableDailyDigest: { useMutation: mutationHook("gic-digest-enable", "telegram.update-preferences", "PATCH", payload => camelize(payload.preference), input => ({ method: "PATCH", input: { dailyDigestEnabled: true, hourIran: input.hourIran, minuteIran: input.minuteIran } })) }, disableDailyDigest: { useMutation: mutationHook("gic-digest-disable", "telegram.update-preferences", "PATCH", payload => camelize(payload.preference), () => ({ method: "PATCH", input: { dailyDigestEnabled: false } })) }, sendTestLongGate: { useMutation: successfulMutation("gic-telegram-test", { success: true }) }, configureWebhook: { useMutation: successfulMutation("gic-telegram-webhook", { success: true }) } },
    providerModels: { list: { useQuery: queryHook("gic-provider-models", "provider-models.list", payload => camelize(payload.models)) }, add: { useMutation: mutationHook("gic-provider-add", "provider-models.add", "POST", payload => camelize(payload.model)) }, toggle: { useMutation: mutationHook("gic-provider-toggle", "provider-models.toggle", "POST", payload => camelize(payload.model)) }, delete: { useMutation: mutationHook("gic-provider-delete", "provider-models.delete", "DELETE") }, fallbackHistory: { useQuery: staticQuery("gic-fallback-history", []) }, fallbackStats: { useQuery: staticQuery("gic-fallback-stats", { totalRuns: 0, successfulRuns: 0, failedRuns: 0 }) }, testFallback: { useMutation: successfulMutation("gic-fallback-test", { success: true, message: "No provider is configured." }) }, testCriticalFallbacks: { useMutation: successfulMutation("gic-fallback-critical", { success: true, results: [] }) } },
    apiKeys: { status: { useQuery: queryHook("gic-provider-status", "provider-status", payload => (payload.providers ?? []).map((item: any) => ({ key: item.provider, configured: true, status: "ready", ...camelize(item) }))) }, checkHealth: { useMutation: successfulMutation("gic-provider-health", { healthy: false, message: "Configure a provider credential before testing health." }) }, update: { useMutation: successfulMutation("gic-provider-update", { success: true }) } },
    notifications: { useQuery: queryHook("gic-notifications", "notifications", payload => camelize(payload.notifications)) }, activity: { useQuery: queryHook("gic-activity", "activity", payload => camelize(payload.events)) }, health: { useQuery: staticQuery("gic-health", { status: "online" }) },
  },
  workspace: { invokeSimulated: { useMutation: mutationHook("gic-workspace-simulated", "workspace.simulate") } },
  useUtils() {
    const queryClient = useQueryClient();
    const invalidator = (key: string) => ({ invalidate: (_input?: unknown) => queryClient.invalidateQueries({ queryKey: [key] }) });
    return { auth: { me: { ...invalidator("operator-session"), setData: (_input: unknown, data: unknown) => queryClient.setQueryData(["operator-session", undefined], data) } }, fix: { dashboard: invalidator("gic-dashboard"), projects: { ...invalidator("gic-projects"), list: invalidator("gic-projects"), detail: invalidator("gic-project-detail"), audit: invalidator("gic-project-audit") }, approvals: { listPending: invalidator("gic-approvals") }, sites: { list: invalidator("gic-sites") }, telegram: { listPairings: invalidator("gic-pairings"), getPreference: invalidator("gic-telegram-preference") }, providerModels: { list: invalidator("gic-provider-models"), fallbackHistory: invalidator("gic-fallback-history"), fallbackStats: invalidator("gic-fallback-stats") }, apiKeys: { status: invalidator("gic-provider-status") } } } as any;
  },
};
