import { writeFile } from "node:fs/promises";
import { createAssignedTask, createProject, getProjectDetail, transitionProject } from "../server/db";
import { runAgent, runQualityGate } from "../server/fix/agentEngine";

const actorUserId = 1;

async function main() {
  const detail = await createProject({
    title: "آزمون تکمیلی: سرویس داخلی ثبت درخواست پشتیبانی",
    description: "یک سرویس داخلی و تک‌سازمانی برای ثبت، مشاهده و تغییر وضعیت تیکت‌های پشتیبانی طراحی کنید. همهٔ الزامات از پیش تأیید شده‌اند: فقط دادهٔ نمونه، بدون PII، بدون API یا پیام‌رسان خارجی، نقش‌های Admin و Reviewer مشخص، سیاست HITL مکتوب، دادهٔ نگهداری‌شدهٔ محلی و deadline سه‌هفته‌ای. هدف فقط ارزیابی Agentهای Backend و QA است؛ هیچ اقدام خارجی یا انتشار واقعی انجام ندهید.",
    clientName: "نمونهٔ داخلی Fix",
    budgetCents: 200000,
    currency: "USD",
    deadlineAt: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
    createdByUserId: actorUserId,
  });
  const projectPublicId = detail.project.publicId;

  const transitions = ["ANALYSIS", "PROPOSAL_DRAFT", "AWAITING_PROPOSAL_APPROVAL", "CLIENT_RESPONSE", "PLANNING", "EXECUTING"] as const;
  for (const toStatus of transitions) {
    await transitionProject({
      projectPublicId,
      toStatus,
      reason: "کنترل‌کنندهٔ آزمون تکمیلی: انتقال امن به مرحلهٔ ارزیابی Backend و QA.",
      actorUserId,
    });
  }

  const backendTask = await createAssignedTask({
    projectId: detail.project.id,
    title: "پیاده‌سازی API تیکت و کنترل دسترسی داخلی",
    description: "طراحی APIهای CRUD تیکت، کنترل نقش Admin/Reviewer، audit log و اعتبارسنجی ورودی با دادهٔ نمونه؛ بدون اتصال خارجی.",
    assignedRole: "Backend Team",
    priority: 1,
  });

  const backend = await runAgent({
    projectPublicId,
    role: "Backend Team",
    actorUserId,
    taskPublicId: backendTask.publicId,
  });

  const quality = await runQualityGate({ projectPublicId, actorUserId });
  const finalDetail = await getProjectDetail(projectPublicId);
  const result = {
    projectPublicId,
    lifecycle: { status: finalDetail.project.status, phase: finalDetail.project.phase },
    backend: { model: backend.model, confidence: backend.output.confidence, summary: backend.output.summary, findings: backend.output.findings.length },
    quality: {
      model: quality.qualityRun.model,
      confidence: quality.qualityRun.output.confidence,
      qcStatus: quality.qualityRun.output.qcStatus,
      qcScore: quality.qualityRun.output.qcScore,
      findings: quality.qualityRun.output.findings,
      outcome: quality.outcome,
    },
    runs: finalDetail.runs.map(run => ({ role: run.role, status: run.status, error: run.errorMessage ?? null })),
    costs: finalDetail.costs.map(cost => ({ provider: cost.provider, model: cost.model, inputTokens: cost.inputTokens, outputTokens: cost.outputTokens })),
    approvals: finalDetail.approvals.map(approval => ({ type: approval.gateType, status: approval.status, requestedBy: approval.requestedByRole })),
  };
  await writeFile("/tmp/fix_specialist_qa_trial_result.json", JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ projectPublicId, status: finalDetail.project.status, runCount: finalDetail.runs.length, qaOutcome: quality.outcome }, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
