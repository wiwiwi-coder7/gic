import { writeFile } from "node:fs/promises";
import { createProject, getProjectDetail, transitionProject } from "../server/db";
import { runHierarchicalPlanning, runQualityGate, runSpecialistWorkstreams } from "../server/fix/agentEngine";

const actorUserId = 1;

async function main() {
  const detail = await createProject({
    title: "آزمون کنترل‌شده: دستیار پشتیبانی مشتری برای کسب‌وکار محلی",
    description: "یک وب‌اپ داخلی برای پاسخ‌گویی به پرسش‌های متداول فارسی و انگلیسی مشتریان، ثبت درخواست‌های پشتیبانی، داشبورد سادهٔ مدیر و کنترل انسانی بر پاسخ‌های حساس طراحی کنید. این سناریو صرفاً برای ارزیابی Planning، تقسیم کار، توسعه و QA Agentها است و هیچ ارتباط خارجی یا اقدام اجرایی واقعی ندارد.",
    clientName: "نمونهٔ داخلی Fix",
    budgetCents: 120000,
    currency: "USD",
    deadlineAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    createdByUserId: actorUserId,
  });
  const projectPublicId = detail.project.publicId;

  const transitions = ["ANALYSIS", "PROPOSAL_DRAFT", "AWAITING_PROPOSAL_APPROVAL", "CLIENT_RESPONSE", "PLANNING"] as const;
  for (const toStatus of transitions) {
    await transitionProject({
      projectPublicId,
      toStatus,
      reason: "کنترل‌کنندهٔ آزمون: انتقال امن به مرحلهٔ ارزیابی Agentها.",
      actorUserId,
    });
  }

  const planning = await runHierarchicalPlanning({ projectPublicId, actorUserId });

  await transitionProject({
    projectPublicId,
    toStatus: "EXECUTING",
    reason: "کنترل‌کنندهٔ آزمون: آغاز workstreamهای تخصصی پس از برنامه‌ریزی.",
    actorUserId,
  });

  let specialists: unknown = { skipped: true, reason: "No eligible specialist workstreams were created." };
  try {
    specialists = await runSpecialistWorkstreams({ projectPublicId, actorUserId, maxTasks: 1 });
  } catch (error) {
    specialists = { skipped: true, reason: error instanceof Error ? error.message : "Unknown specialist execution error" };
  }

  let quality: unknown = { skipped: true, reason: "Quality gate not reached." };
  try {
    quality = await runQualityGate({ projectPublicId, actorUserId });
  } catch (error) {
    quality = { skipped: true, reason: error instanceof Error ? error.message : "Unknown QA execution error" };
  }

  const finalDetail = await getProjectDetail(projectPublicId);
  const result = {
    projectPublicId,
    lifecycle: { status: finalDetail.project.status, phase: finalDetail.project.phase },
    planning: {
      architectModel: planning.architectRun.model,
      architectConfidence: planning.architectRun.output.confidence,
      architectTaskCount: planning.architectRun.output.tasks.length,
      managerModel: planning.managerRun.model,
      managerConfidence: planning.managerRun.output.confidence,
      managerTaskCount: planning.managerRun.output.tasks.length,
    },
    specialists,
    quality,
    runs: finalDetail.runs.map(run => ({ role: run.role, status: run.status, error: run.errorMessage ?? null })),
    tasks: finalDetail.tasks.map(task => ({ role: task.assignedRole, status: task.status, title: task.title })),
    approvals: finalDetail.approvals.map(approval => ({ type: approval.gateType, status: approval.status, requestedBy: approval.requestedByRole })),
    costs: finalDetail.costs.map(cost => ({ provider: cost.provider, model: cost.model, inputTokens: cost.inputTokens, outputTokens: cost.outputTokens })),
    events: finalDetail.events.slice(0, 12).map(event => ({ type: event.eventType, title: event.title })),
  };

  await writeFile("/tmp/fix_agent_trial_result.json", JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ projectPublicId, status: finalDetail.project.status, runCount: finalDetail.runs.length }, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
