import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { BellRing, Copy, Link2, Send, Unlink, Cpu, Plus, Trash2, KeyRound, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";

const agentRoleOptions = [
  "Lead Architect",
  "Manager",
  "Scout",
  "Proposal",
  "Backend Team",
  "AI/Automation Team",
  "QA/Security Agent",
  "Delivery Manager",
] as const;

type AgentRoleOption = (typeof agentRoleOptions)[number];
type FallbackTestResult = {
  role: AgentRoleOption;
  primaryModel: string;
  fallbackModel: string;
  primaryFailed: true;
  fallbackSucceeded: true;
  simulatedReason: "network";
  durationMs: number;
};

type CriticalFallbackResult = {
  role: AgentRoleOption;
  primaryModel: string;
  fallbackModel: string | null;
  status: "succeeded" | "failed";
  reason: string;
  durationMs: number;
};

export default function SettingsPage() {
  const { user } = useAuth(); const utils = trpc.useUtils();
  const enabled = user?.role === "owner" || user?.role === "admin";
  const [code, setCode] = useState<string | null>(null);
  const [locale, setLocale] = useState<"fa" | "en">("fa");
  const [hour, setHour] = useState(9); const [minute, setMinute] = useState<0 | 30>(0);
  
  // Model management state
  const [newProvider, setNewProvider] = useState("anthropic");
  const [newModelName, setNewModelName] = useState("");
  const [newTier, setNewTier] = useState("reasoning");
  const [testRole, setTestRole] = useState<AgentRoleOption>("Lead Architect");
  const [fallbackResult, setFallbackResult] = useState<FallbackTestResult | null>(null);
  const [criticalResults, setCriticalResults] = useState<CriticalFallbackResult[] | null>(null);

  // API Key management state
  const [keyInputs, setKeyInputs] = useState<Record<string, string>>({});
  const [healthStatuses, setHealthStatuses] = useState<Record<string, { healthy: boolean; message: string }>>({});

  const pairings = trpc.fix.telegram.listPairings.useQuery(undefined, { enabled });
  const preference = trpc.fix.telegram.getPreference.useQuery(undefined, { enabled });
  const models = trpc.fix.providerModels.list.useQuery(undefined, { enabled });
  const fallbackHistory = trpc.fix.providerModels.fallbackHistory.useQuery(undefined, { enabled });
  const fallbackStats = trpc.fix.providerModels.fallbackStats.useQuery(undefined, { enabled });
  const apiKeysStatus = trpc.fix.apiKeys.status.useQuery(undefined, { enabled });
  const checkKeyHealth = trpc.fix.apiKeys.checkHealth.useMutation({
    onSuccess: (res) => {
      setHealthStatuses(prev => ({ ...prev, [res.key]: { healthy: res.healthy, message: res.message } }));
      if (res.healthy) toast.success(res.message);
      else toast.error(res.message);
    },
    onError: x => toast.error(x.message)
  });

  useEffect(() => {
    if (preference.data) {
      setLocale(preference.data.locale as "fa" | "en");
      setHour(preference.data.dailyDigestHourIran);
      setMinute(preference.data.dailyDigestMinuteIran as 0 | 30);
    }
  }, [preference.data]);

  const refresh = () => {
    void utils.fix.telegram.listPairings.invalidate();
    void utils.fix.telegram.getPreference.invalidate();
    void utils.fix.providerModels.list.invalidate();
    void utils.fix.providerModels.fallbackHistory.invalidate();
    void utils.fix.providerModels.fallbackStats.invalidate();
    void utils.fix.apiKeys.status.invalidate();
  };

  const pairing = trpc.fix.telegram.generatePairingCode.useMutation({ onSuccess: x => { setCode(x.code); refresh(); toast.success("کد اتصال ساخته شد."); }, onError: x => toast.error(x.message) });
  const revoke = trpc.fix.telegram.revokePairing.useMutation({ onSuccess: () => { refresh(); toast.success("اتصال لغو شد."); }, onError: x => toast.error(x.message) });
  const webhook = trpc.fix.telegram.configureWebhook.useMutation({ onSuccess: () => toast.success("وب‌هوک امن تلگرام تنظیم شد."), onError: x => toast.error(x.message) });
  const save = trpc.fix.telegram.updatePreference.useMutation({ onSuccess: () => { refresh(); toast.success("تنظیمات ذخیره شد."); }, onError: x => toast.error(x.message) });
  const enableDigest = trpc.fix.telegram.enableDailyDigest.useMutation({ onSuccess: () => { refresh(); toast.success("گزارش روزانه فعال شد."); }, onError: x => toast.error(x.message) });
  const disableDigest = trpc.fix.telegram.disableDailyDigest.useMutation({ onSuccess: () => { refresh(); toast.success("گزارش روزانه غیرفعال شد."); }, onError: x => toast.error(x.message) });
  const testGate = trpc.fix.telegram.sendTestLongGate.useMutation({ onSuccess: () => toast.success("گیت آزمایشی ایجاد شد و به تلگرام ارسال می‌شود."), onError: x => toast.error(x.message) });

  const addModel = trpc.fix.providerModels.add.useMutation({
    onSuccess: () => { setNewModelName(""); refresh(); toast.success("مدل با موفقیت اضافه شد."); },
    onError: x => toast.error(x.message)
  });
  const toggleModel = trpc.fix.providerModels.toggle.useMutation({
    onSuccess: () => { refresh(); toast.success("وضعیت مدل تغییر کرد."); },
    onError: x => toast.error(x.message)
  });
  const deleteModel = trpc.fix.providerModels.delete.useMutation({
    onSuccess: () => { refresh(); toast.success("مدل حذف شد."); },
    onError: x => toast.error(x.message)
  });
  const testFallback = trpc.fix.providerModels.testFallback.useMutation({
    onSuccess: data => {
      if (data.status === "failed") {
        setFallbackResult(null);
        toast.error("آزمون fallback ناموفق بود؛ نتیجه در تاریخچه ثبت شد.");
        return;
      }
      setFallbackResult(data);
      toast.success("مسیر fallback با موفقیت بررسی شد.");
    },
    onError: error => {
      setFallbackResult(null);
      toast.error(error.message);
    },
  });
  const testCriticalFallbacks = trpc.fix.providerModels.testCriticalFallbacks.useMutation({
    onSuccess: data => {
      setCriticalResults(data);
      refresh();
      const failed = data.filter(item => item.status === "failed").length;
      if (failed) toast.error(`${failed} آزمون از سه نقش کلیدی ناموفق بود؛ تاریخچه را بررسی کنید.`);
      else toast.success("هر سه آزمون fallback نقش‌های کلیدی موفق بودند.");
    },
    onError: error => toast.error(error.message),
  });

  const updateApiKey = trpc.fix.apiKeys.update.useMutation({
    onSuccess: (data) => {
      setKeyInputs(prev => ({ ...prev, [data.key]: "" }));
      refresh();
      toast.success("کلید API با موفقیت به‌روزرسانی شد.");
    },
    onError: x => toast.error(x.message)
  });

  if (!enabled) return <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-900">تنها مالک و مدیر آژانس به تنظیمات دسترسی دارند.</div>;
  const isDigestOn = Boolean(preference.data?.dailyDigestEnabled);

  return <div className="space-y-6" dir="rtl">
    <div>
      <h1 className="text-2xl font-semibold text-[#1d2d23]">تنظیمات پیشرفته و کلیدهای API ارائه‌دهندگان</h1>
      <p className="mt-1 text-sm text-[#738176]">مدیریت امن کلیدهای API، نسخه‌های مدل‌ها، کانال تلگرام و گزارش‌های خودکار پروژه‌ها.</p>
    </div>

    {/* API Keys Management Section with Color Status Indicators */}
    <Card className="border-[#cfe0d1]">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-center gap-3">
          <KeyRound className="h-5 w-5 text-[#337144]"/>
          <div>
            <h2 className="font-semibold">وضعیت سلامت و مدیریت کلیدهای API (Secure API Keys & Health)</h2>
            <p className="mt-1 text-sm text-[#697a6e]">بررسی زنده سلامت اتصال، وضعیت تنظیم کلیدها و امکان به‌روزرسانی امن.</p>
          </div>
        </div>

        <div className="grid gap-3 pt-2">
          {apiKeysStatus.data?.map(item => {
            const val = keyInputs[item.key] || "";
            const health = healthStatuses[item.key];
            
            // Determine indicator color & state text
            let indicatorColor = "bg-slate-300";
            let statusText = "تنظیم نشده (خاکستری)";
            if (item.configured) {
              if (health === undefined) {
                indicatorColor = "bg-amber-400";
                statusText = "آماده / نیازمند بررسی اتصال (زرد)";
              } else if (health.healthy) {
                indicatorColor = "bg-emerald-500";
                statusText = health.message; // "سبز: اتصال موفق"
              } else {
                indicatorColor = "bg-rose-500";
                statusText = health.message; // "قرمز: خطای اتصال"
              }
            }

            return (
              <div key={item.key} className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3.5 rounded-lg border bg-white shadow-xs">
                <div className="flex items-center gap-3">
                  <span className={`inline-block h-3.5 w-3.5 rounded-full ${indicatorColor} ring-4 ring-slate-50 flex-shrink-0`} title={statusText} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold text-slate-800">{item.key}</span>
                      <Badge variant="outline" className="text-xs">
                        {item.configured ? "تنظیم‌شده" : "خالی"}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{statusText}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Button 
                    size="sm" 
                    variant="outline"
                    disabled={!item.configured || checkKeyHealth.isPending}
                    onClick={() => checkKeyHealth.mutate({ key: item.key })}
                  >
                    <RefreshCw className="ml-1.5 h-3.5 w-3.5" /> بررسی اتصال
                  </Button>
                  <Input 
                    type="password" 
                    placeholder="مقدار جدید کلید" 
                    value={val} 
                    onChange={e => setKeyInputs(prev => ({ ...prev, [item.key]: e.target.value }))}
                    className="w-44 text-sm"
                  />
                  <Button 
                    size="sm" 
                    disabled={!val.trim() || updateApiKey.isPending}
                    onClick={() => updateApiKey.mutate({ key: item.key, value: val })}
                  >
                    ذخیره
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>

    {/* AI Models Management */}
    <Card className="border-[#cfe0d1]">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-center gap-3">
          <Cpu className="h-5 w-5 text-[#337144]"/>
          <div>
            <h2 className="font-semibold">مدیریت نسخه‌ها و مدل‌های ارائه‌دهندگان (Provider Models)</h2>
            <p className="mt-1 text-sm text-[#697a6e]">چند مدل مختلف برای هر ارائه‌دهنده (مثل Grok یا Claude) برای تسک‌های کوتاه، کدنویسی، reasoning و fallback ثبت کنید.</p>
          </div>
        </div>

        {/* Add Model Form */}
        <div className="grid gap-3 sm:grid-cols-4 pt-2">
          <select className="h-10 rounded-md border px-3 text-sm bg-white" value={newProvider} onChange={e => setNewProvider(e.target.value)}>
            <option value="anthropic">Anthropic (Claude)</option>
            <option value="openai">OpenAI (GPT)</option>
            <option value="google">Google (Gemini)</option>
            <option value="xai">xAI (Grok)</option>
            <option value="moonshot">Moonshot (Kimi)</option>
            <option value="elevenlabs">ElevenLabs</option>
            <option value="custom">سایر ارائه‌دهندگان</option>
          </select>
          <Input placeholder="شناسه مدل (مثلا grok-4.5 یا claude-opus)" value={newModelName} onChange={e => setNewModelName(e.target.value)} />
          <select className="h-10 rounded-md border px-3 text-sm bg-white" value={newTier} onChange={e => setNewTier(e.target.value)}>
            <option value="reasoning">استدلال سخت (Reasoning)</option>
            <option value="coding">کدنویسی و توسعه (Coding)</option>
            <option value="fast">پاسخ سریع و سبک (Fast/Short)</option>
            <option value="fallback">پشتیبان / Fallback</option>
          </select>
          <Button disabled={!newModelName.trim() || addModel.isPending} onClick={() => addModel.mutate({ provider: newProvider, modelName: newModelName.trim(), tier: newTier })}>
            <Plus className="ml-1.5 h-4 w-4"/> افزودن مدل
          </Button>
        </div>

        {/* Models List Table */}
        <div className="rounded-lg border bg-white divide-y overflow-hidden">
          {models.data?.length ? models.data.map(m => (
            <div className="flex items-center justify-between p-3.5" key={m.id}>
              <div className="flex items-center gap-3">
                <Badge variant={m.enabled ? "default" : "secondary"} className={m.enabled ? "bg-[#337144]" : ""}>
                  {m.provider}
                </Badge>
                <div>
                  <span className="font-mono text-sm font-medium text-slate-800">{m.modelName}</span>
                  <span className="mr-2 rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{m.tier}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => toggleModel.mutate({ id: m.id, enabled: !m.enabled })}>
                  {m.enabled ? "فعال" : "غیرفعال"}
                </Button>
                <Button size="sm" variant="ghost" className="text-rose-600 hover:text-rose-700" onClick={() => deleteModel.mutate({ id: m.id })}>
                  <Trash2 className="h-4 w-4"/>
                </Button>
              </div>
            </div>
          )) : (
            <p className="p-4 text-sm text-center text-slate-500">مدلی ثبت نشده است. از فرم بالا برای افزودن نسخه‌های دلخواه استفاده کنید.</p>
          )}
        </div>

        <div className="rounded-xl border border-[#d7e7d9] bg-[#f6faf6] p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <h3 className="font-medium text-[#25402d]">آزمون دستی مسیر جایگزین مدل</h3>
              <p className="mt-1 max-w-2xl text-xs leading-5 text-[#65786b]">
                مدل اصلی این نقش عمداً با خطای شبکه شبیه‌سازی می‌شود. سپس فقط fallback داخلی با یک پاسخ JSON بسیار کوچک بررسی خواهد شد؛ هیچ پروژه، تسک یا گیت تأییدی تغییر نمی‌کند.
              </p>
            </div>
            <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
              <select
                className="h-10 min-w-52 rounded-md border border-[#c9d9cc] bg-white px-3 text-sm"
                value={testRole}
                onChange={event => setTestRole(event.target.value as AgentRoleOption)}
                aria-label="نقش Agent برای آزمون fallback"
              >
                {agentRoleOptions.map(role => <option key={role} value={role}>{role}</option>)}
              </select>
              <Button
                disabled={testFallback.isPending}
                onClick={() => {
                  setFallbackResult(null);
                  testFallback.mutate({ role: testRole });
                }}
              >
                {testFallback.isPending ? <RefreshCw className="ml-1.5 h-4 w-4 animate-spin" /> : <AlertCircle className="ml-1.5 h-4 w-4" />}
                شبیه‌سازی خرابی مدل اصلی
              </Button>
            </div>
          </div>

          {fallbackResult && (
            <div className="mt-4 rounded-lg border border-emerald-200 bg-white p-3.5">
              <div className="flex items-center gap-2 text-sm font-medium text-emerald-800">
                <CheckCircle2 className="h-4 w-4" />
                آزمون با موفقیت از مسیر fallback عبور کرد
              </div>
              <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2 xl:grid-cols-5">
                <ResultField label="نقش" value={fallbackResult.role} />
                <ResultField label="مدل اصلی" value={fallbackResult.primaryModel} mono />
                <ResultField label="مدل جایگزین" value={fallbackResult.fallbackModel} mono />
                <ResultField label="دلیل شبیه‌سازی" value="network" />
                <ResultField label="زمان اجرا" value={`${fallbackResult.durationMs.toLocaleString("fa-IR")} ms`} />
              </div>
            </div>
          )}

          <div className="mt-4 border-t border-[#dce8de] pt-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h4 className="text-sm font-medium text-[#25402d]">آزمون نقش‌های کلیدی</h4>
                <p className="mt-1 text-xs text-[#65786b]">Lead Architect، Backend Team و QA/Security Agent به‌ترتیب اجرا می‌شوند؛ خرابی یک مورد، دو مورد دیگر را متوقف نمی‌کند.</p>
              </div>
              <Button variant="outline" disabled={testCriticalFallbacks.isPending} onClick={() => { setCriticalResults(null); testCriticalFallbacks.mutate(); }}>
                {testCriticalFallbacks.isPending && <RefreshCw className="ml-1.5 h-4 w-4 animate-spin" />}
                آزمون سه نقش کلیدی
              </Button>
            </div>
            {criticalResults && <div className="mt-3 grid gap-2 md:grid-cols-3">
              {criticalResults.map(result => <div key={result.role} className={`rounded-lg border p-3 ${result.status === "succeeded" ? "border-emerald-200 bg-white" : "border-rose-200 bg-rose-50"}`}>
                <div className="flex items-center justify-between gap-2"><span className="text-xs font-semibold text-[#2d4234]">{result.role}</span><Badge variant="outline" className={result.status === "succeeded" ? "border-emerald-200 text-emerald-700" : "border-rose-200 text-rose-700"}>{result.status === "succeeded" ? "موفق" : "ناموفق"}</Badge></div>
                <p className="mt-2 break-all font-mono text-[11px] text-[#65786b]">{result.primaryModel} → {result.fallbackModel ?? "—"}</p>
                <p className="mt-1 text-[11px] text-[#65786b]">{result.reason} · {result.durationMs.toLocaleString("fa-IR")} ms</p>
              </div>)}
            </div>}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[.9fr_1.4fr]">
          <div className="rounded-xl border border-[#d7e7d9] bg-white p-4">
            <h3 className="font-medium text-[#25402d]">آمار ۳۰ روزهٔ fallback</h3>
            <p className="mt-1 text-xs text-[#65786b]">بر مبنای آزمون‌های ثبت‌شده در Settings.</p>
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <MetricTile label="کل آزمون‌ها" value={fallbackStats.data?.total ?? 0} />
              <MetricTile label="موفق" value={fallbackStats.data?.succeeded ?? 0} tone="success" />
              <MetricTile label="ناموفق" value={fallbackStats.data?.failed ?? 0} tone={fallbackStats.data?.failed ? "danger" : "neutral"} />
              <MetricTile label="نرخ موفقیت" value={`${fallbackStats.data?.successRate ?? 0}%`} />
            </div>
            <p className="mt-3 text-xs text-[#65786b]">میانگین زمان اجرا: <span className="font-medium text-[#2d4234]">{(fallbackStats.data?.averageDurationMs ?? 0).toLocaleString("fa-IR")} ms</span></p>
          </div>

          <div className="overflow-hidden rounded-xl border border-[#d7e7d9] bg-white">
            <div className="flex items-center justify-between border-b border-[#e8f0e9] px-4 py-3"><div><h3 className="font-medium text-[#25402d]">تاریخچهٔ آزمون‌ها</h3><p className="mt-0.5 text-xs text-[#65786b]">آخرین ۳۰ اجرا؛ بدون prompt، پاسخ خام یا کلید API.</p></div><Button size="sm" variant="ghost" onClick={refresh}><RefreshCw className="h-3.5 w-3.5" /></Button></div>
            <div className="max-h-72 divide-y overflow-y-auto">
              {fallbackHistory.data?.length ? fallbackHistory.data.map(item => <div className="grid gap-1 px-4 py-3 text-xs sm:grid-cols-[1fr_auto]" key={item.publicId}>
                <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="font-medium text-[#2d4234]">{item.role}</span><Badge variant="outline" className={item.status === "succeeded" ? "border-emerald-200 text-emerald-700" : "border-rose-200 text-rose-700"}>{item.status === "succeeded" ? "موفق" : "ناموفق"}</Badge></div><p className="mt-1 break-all font-mono text-[11px] text-[#65786b]">{item.primaryModel} → {item.fallbackModel ?? "—"}</p></div>
                <div className="text-left text-[11px] text-[#748579]"><p>{item.reason} · {(item.durationMs ?? 0).toLocaleString("fa-IR")} ms</p><p className="mt-1">{new Date(item.createdAt).toLocaleString("fa-IR")}</p></div>
              </div>) : <p className="p-6 text-center text-sm text-[#738176]">هنوز آزمونی در تاریخچه ثبت نشده است.</p>}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    {/* Telegram & Pairing Section */}
    <Card className="border-[#cfe0d1]">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex gap-3">
            <Send className="mt-1 h-5 w-5 text-[#337144]"/>
            <div>
              <h2 className="font-semibold">کانال تأیید تلگرام</h2>
              <p className="mt-1 text-sm text-[#697a6e]">اتصال ربات برای دریافت کارت‌های تأیید، رد و درخواست تغییرات.</p>
            </div>
          </div>
          <Button variant="outline" disabled={webhook.isPending} onClick={() => webhook.mutate()}>
            <Link2 className="ml-2 h-4 w-4"/> تنظیم وب‌هوک
          </Button>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button disabled={pairing.isPending} onClick={() => pairing.mutate()}>ایجاد کد اتصال</Button>
          {code && <Button variant="outline" onClick={() => void navigator.clipboard.writeText(code).then(() => toast.success("کد کپی شد."))}><Copy className="ml-2 h-4 w-4"/>/pair {code}</Button>}
        </div>
        <div className="divide-y rounded-lg border bg-white">
          {pairings.data?.length ? pairings.data.map(p => (
            <div className="flex items-center justify-between p-3" key={p.publicId}>
              <span className="text-sm">{p.displayName || "چت در انتظار اتصال"} <Badge variant="outline" className="mr-2">{p.status}</Badge></span>
              {["active","pending"].includes(p.status) && <Button size="sm" variant="ghost" className="text-rose-700" onClick={() => revoke.mutate({ pairingPublicId: p.publicId })}><Unlink className="ml-1 h-3.5 w-3.5"/>لغو</Button>}
            </div>
          )) : <p className="p-3 text-sm text-[#738176]">چتی متصل نیست.</p>}
        </div>
      </CardContent>
    </Card>

    <div className="grid gap-5 md:grid-cols-2">
      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="flex gap-3">
            <BellRing className="h-5 w-5 text-[#337144]"/>
            <div>
              <h2 className="font-semibold">زبان اعلان‌ها</h2>
              <p className="mt-1 text-xs text-[#738176]">انتخاب زبان فارسی یا انگلیسی برای پیام‌های تلگرام.</p>
            </div>
          </div>
          <select className="h-10 w-full rounded-md border px-3 bg-white" value={locale} onChange={e => setLocale(e.target.value as "fa"|"en")}>
            <option value="fa">فارسی</option>
            <option value="en">English</option>
          </select>
          <Button className="w-full" disabled={save.isPending} onClick={() => save.mutate({ locale, dailyDigestHourIran: hour, dailyDigestMinuteIran: minute })}>
            ذخیرهٔ تنظیمات زبان
          </Button>
          <Button className="w-full" variant="outline" disabled={testGate.isPending} onClick={() => testGate.mutate()}>
            ارسال اعلان آزمایشی طولانی
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-5">
          <div>
            <h2 className="font-semibold">گزارش روزانهٔ پروژه‌ها</h2>
            <p className="mt-1 text-xs text-[#738176]">ارسال خودکار خلاصه وضعیت پروژه‌ها طبق ساعت محلی ایران.</p>
          </div>
          <div className="flex gap-3">
            <Input type="number" min="0" max="23" value={hour} onChange={e => setHour(Math.max(0, Math.min(23, Number(e.target.value))))}/>
            <select className="h-10 rounded-md border px-3 bg-white" value={minute} onChange={e => setMinute(Number(e.target.value) as 0|30)}>
              <option value={0}>00 دقیقه</option>
              <option value={30}>30 دقیقه</option>
            </select>
          </div>
          <p className="text-xs text-amber-700">توجه: فعال‌سازی زمان‌بندی نیازمند انتشار سایت است.</p>
          {isDigestOn ? (
            <Button className="w-full" variant="outline" disabled={disableDigest.isPending} onClick={() => disableDigest.mutate()}>
              غیرفعال‌کردن گزارش روزانه
            </Button>
          ) : (
            <Button className="w-full" disabled={enableDigest.isPending} onClick={() => enableDigest.mutate({ hourIran: hour, minuteIran: minute })}>
              فعال‌کردن گزارش روزانه
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  </div>;
}

function ResultField({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return <div className="rounded-md bg-[#f7faf7] px-2.5 py-2 text-right">
    <p className="text-[10px] font-medium text-[#748579]">{label}</p>
    <p className={`mt-1 break-all text-[#2d4234] ${mono ? "font-mono" : ""}`}>{value}</p>
  </div>;
}

function MetricTile({ label, value, tone = "neutral" }: { label: string; value: string | number; tone?: "neutral" | "success" | "danger" }) {
  const color = tone === "success" ? "text-emerald-700" : tone === "danger" ? "text-rose-700" : "text-[#2d4234]";
  return <div className="rounded-md bg-[#f7faf7] px-3 py-2.5"><p className="text-[10px] font-medium text-[#748579]">{label}</p><p className={`mt-1 text-base font-semibold ${color}`}>{value}</p></div>;
}
