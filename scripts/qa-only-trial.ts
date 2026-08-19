import { writeFile } from "node:fs/promises";
import { createProject, getProjectDetail, transitionProject } from "../server/db";
import { runQualityGate } from "../server/fix/agentEngine";

const actorUserId = 1;

async function main() {
  const detail = await createProject({
    title: "آزمون QA: سرویس تیکت داخلی با کنترل دسترسی",
    description: "ارزیابی QA و امنیت یک سرویس داخلی تیکت با دادهٔ کاملاً نمونه، CRUD تیکت، نقش‌های Admin و Reviewer، audit log، اعتبارسنجی ورودی، بدون PII و بدون هرگونه اتصال خارجی. معیار پذیرش: کنترل دسترسی نقش‌محور، ثبت audit، اعتبارسنجی درخواست و تست مسیرهای مجاز/غیرمجاز. این پروژه فقط برای آزمون Agent QA است.",
    clientName: "نمونهٔ داخلی Fix",
    budgetCents: 150000,
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
      reason: "کنترل‌کنندهٔ آزمون QA: انتقال امن برای اجرای gate کیفیت.",
      actorUserId,
    });
  }

  const quality = await runQualityGate({ projectPublicId, actorUserId });
  const finalDetail = await getProjectDetail(projectPublicId);
  const result = {
    projectPublicId,
    lifecycle: { status: finalDetail.project.status, phase: finalDetail.project.phase },
    quality: {
      model: quality.qualityRun.model,
      confidence: quality.qualityRun.output.confidence,
      qcStatus: quality.qualityRun.output.qcStatus,
      qcScore: quality.qualityRun.output.qcScore,
      summary: quality.qualityRun.output.summary,
      findings: quality.qualityRun.output.findings,
      outcome: quality.outcome,
    },
    runs: finalDetail.runs.map(run => ({ role: run.role, status: run.status, error: run.errorMessage ?? null })),
    costs: finalDetail.costs.map(cost => ({ provider: cost.provider, model: cost.model, inputTokens: cost.inputTokens, outputTokens: cost.outputTokens })),
    approvals: finalDetail.approvals.map(approval => ({ type: approval.gateType, status: approval.status, requestedBy: approval.requestedByRole })),
  };
  await writeFile("/tmp/fix_qa_trial_result.json", JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ projectPublicId, status: finalDetail.project.status, qaOutcome: quality.outcome }, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
