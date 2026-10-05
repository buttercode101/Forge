export type Verdict = "PROVEN" | "PARTIAL" | "UNVERIFIED" | "DISPROVEN";

export type ClaimKind =
  | "tests-pass"
  | "build-works"
  | "deployment-works"
  | "requirement-satisfied"
  | "project-complete";

export type Evidence =
  | { type: "command"; id?: string; command: string; exitCode: number; commit?: string; requirement?: string }
  | { type: "deployment"; id?: string; status: number; deployedCommit?: string; expectedCommit?: string; route?: string }
  | { type: "requirement"; id: string; verdict: Exclude<Verdict, "PARTIAL">; evidenceIds: string[] }
  | { type: "declaration"; text: string };

export interface Verification {
  kind: ClaimKind;
  verdict: Verdict;
  reasons: string[];
}

const isTestCommand = (command: string) => /^(?:npm|pnpm|yarn|bun)\s+(?:run\s+)?test(?:\s|$)|^(?:npx\s+)?(?:vitest|jest)(?:\s|$)|^pytest(?:\s|$)|^python(?:3)?\s+-m\s+(?:pytest|unittest)(?:\s|$)|^go\s+test(?:\s|$)|^cargo\s+test(?:\s|$)/i.test(command.trim());
const isBuildCommand = (command: string) => /^(?:npm|pnpm|yarn|bun)\s+(?:run\s+)?build(?:\s|$)|^go\s+build(?:\s|$)|^cargo\s+build(?:\s|$)|^python(?:3)?\s+-m\s+build(?:\s|$)/i.test(command.trim());

const evidenceSupportsRequirement = (id: string, requirementId: string, evidence: Evidence[]) => {
  const item = evidence.find(e => (e.type === "command" || e.type === "deployment") && e.id === id);
  if (!item) return false;
  if (item.type === "command") return item.requirement === requirementId;
  return false;
};

export function verifyClaim(kind: ClaimKind, evidence: Evidence[]): Verification {
  const reasons: string[] = [];
  const declarations = evidence.filter(e => e.type === "declaration");
  if (declarations.length) reasons.push("Agent declarations are context only; they are not verification evidence.");

  if (kind === "tests-pass") {
    const testRuns = evidence.filter(e => e.type === "command" && isTestCommand(e.command));
    if (!testRuns.length) return { kind, verdict: "UNVERIFIED", reasons: [...reasons, "No executed test command evidence was supplied."] };
    if (testRuns.some(e => e.type === "command" && e.exitCode !== 0)) return { kind, verdict: "DISPROVEN", reasons: [...reasons, "At least one supplied test execution failed."] };
    return { kind, verdict: "PROVEN", reasons: [...reasons, "Supplied test executions completed with exit code 0."] };
  }

  if (kind === "build-works") {
    const builds = evidence.filter(e => e.type === "command" && isBuildCommand(e.command) && e.exitCode === 0);
    const failedBuild = evidence.some(e => e.type === "command" && isBuildCommand(e.command) && e.exitCode !== 0);
    if (failedBuild) return { kind, verdict: "DISPROVEN", reasons: [...reasons, "A supplied build execution failed."] };
    return builds.length
      ? { kind, verdict: "PROVEN", reasons: [...reasons, "A build command executed successfully."] }
      : { kind, verdict: "UNVERIFIED", reasons: [...reasons, "No successful build execution evidence was supplied."] };
  }

  if (kind === "deployment-works") {
    const deployments = evidence.filter((e): e is Extract<Evidence,{type:"deployment"}> => e.type === "deployment");
    if (!deployments.length) return { kind, verdict: "UNVERIFIED", reasons: [...reasons, "No deployment observation was supplied."] };
    if (deployments.some(e => e.status < 200 || e.status >= 400)) return { kind, verdict: "DISPROVEN", reasons: [...reasons, "A supplied deployment observation returned a failing HTTP status."] };
    const mismatched = deployments.some(e => e.expectedCommit && e.deployedCommit !== e.expectedCommit);
    if (mismatched) return { kind, verdict: "DISPROVEN", reasons: [...reasons, "The observed deployment does not match the expected source commit."] };
    const commitBound = deployments.some(e => e.expectedCommit && e.deployedCommit === e.expectedCommit);
    return commitBound
      ? { kind, verdict: "PROVEN", reasons: [...reasons, "A healthy deployment was observed and bound to the expected commit."] }
      : { kind, verdict: "PARTIAL", reasons: [...reasons, "The deployment responded successfully, but source-to-deployment provenance was not supplied."] };
  }

  if (kind === "requirement-satisfied") {
    const req = evidence.filter((e): e is Extract<Evidence,{type:"requirement"}> => e.type === "requirement");
    if (!req.length) return { kind, verdict: "UNVERIFIED", reasons: [...reasons, "No requirement verification record was supplied."] };
    if (req.some(e => e.verdict === "DISPROVEN")) return { kind, verdict: "DISPROVEN", reasons: [...reasons, "At least one requirement is disproven."] };
    if (req.every(e => e.verdict === "PROVEN" && e.evidenceIds.length > 0 && e.evidenceIds.every(id => evidenceSupportsRequirement(id, e.id, evidence)))) return { kind, verdict: "PROVEN", reasons: [...reasons, "Every supplied requirement is proven by evidence explicitly bound to that requirement."] };
    return { kind, verdict: "UNVERIFIED", reasons: [...reasons, "One or more requirements lack proven evidence."] };
  }

  const requirements = evidence.filter((e): e is Extract<Evidence,{type:"requirement"}> => e.type === "requirement");
  if (!requirements.length) return { kind, verdict: "UNVERIFIED", reasons: [...reasons, "Project completion requires an explicit requirement set."] };
  if (requirements.some(e => e.verdict === "DISPROVEN")) return { kind, verdict: "DISPROVEN", reasons: [...reasons, "A required outcome is disproven."] };
  if (requirements.some(e => e.verdict !== "PROVEN" || !e.evidenceIds.length)) return { kind, verdict: "UNVERIFIED", reasons: [...reasons, "Not every requirement is proven by evidence."] };
  if (requirements.some(r => r.evidenceIds.some(id => !evidenceSupportsRequirement(id, r.id, evidence)))) {
    return { kind, verdict: "UNVERIFIED", reasons: [...reasons, "One or more requirement evidence references are missing or not explicitly bound to that requirement."] };
  }
  const tests = verifyClaim("tests-pass", evidence);
  const build = verifyClaim("build-works", evidence);
  if (tests.verdict !== "PROVEN" || build.verdict !== "PROVEN") {
    return { kind, verdict: "UNVERIFIED", reasons: [...reasons, "Requirements are proven, but executable test/build evidence is incomplete."] };
  }
  const execution = evidence.filter((e): e is Extract<Evidence,{type:"command"}> => e.type === "command" && (isTestCommand(e.command) || isBuildCommand(e.command)));
  if (execution.some(e => !e.commit) || new Set(execution.map(e => e.commit)).size !== 1) {
    return { kind, verdict: "UNVERIFIED", reasons: [...reasons, "Project completion requires test and build evidence bound to the same source commit."] };
  }
  return { kind, verdict: "PROVEN", reasons: [...reasons, "Requirements, tests and build are supported by linked execution evidence from the same commit."] };
}
