export type Verdict = "PROVEN" | "PARTIAL" | "UNVERIFIED" | "DISPROVEN";

export type ClaimKind =
  | "tests-pass"
  | "build-works"
  | "deployment-works"
  | "requirement-satisfied"
  | "project-complete";

export type Evidence =
  | { type: "command"; command: string; exitCode: number; commit?: string; requirement?: string }
  | { type: "deployment"; status: number; deployedCommit?: string; expectedCommit?: string; route?: string }
  | { type: "requirement"; id: string; verdict: Exclude<Verdict, "PARTIAL">; evidenceIds: string[] }
  | { type: "declaration"; text: string };

export interface Verification {
  kind: ClaimKind;
  verdict: Verdict;
  reasons: string[];
}

const successfulCommand = (e: Evidence, token: string) =>
  e.type === "command" && e.exitCode === 0 && e.command.toLowerCase().includes(token);

export function verifyClaim(kind: ClaimKind, evidence: Evidence[]): Verification {
  const reasons: string[] = [];
  const declarations = evidence.filter(e => e.type === "declaration");
  if (declarations.length) reasons.push("Agent declarations are context only; they are not verification evidence.");

  if (kind === "tests-pass") {
    const testRuns = evidence.filter(e => e.type === "command" && /(^|\s)(test|pytest|vitest|jest|unittest|go test|cargo test)(\s|$)/i.test(e.command));
    if (!testRuns.length) return { kind, verdict: "UNVERIFIED", reasons: [...reasons, "No executed test command evidence was supplied."] };
    if (testRuns.some(e => e.type === "command" && e.exitCode !== 0)) return { kind, verdict: "DISPROVEN", reasons: [...reasons, "At least one supplied test execution failed."] };
    return { kind, verdict: "PROVEN", reasons: [...reasons, "Supplied test executions completed with exit code 0."] };
  }

  if (kind === "build-works") {
    const builds = evidence.filter(e => successfulCommand(e, "build"));
    const failedBuild = evidence.some(e => e.type === "command" && e.command.toLowerCase().includes("build") && e.exitCode !== 0);
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
    if (req.every(e => e.verdict === "PROVEN" && e.evidenceIds.length > 0)) return { kind, verdict: "PROVEN", reasons: [...reasons, "Every supplied requirement is proven by referenced evidence."] };
    return { kind, verdict: "UNVERIFIED", reasons: [...reasons, "One or more requirements lack proven evidence."] };
  }

  const requirements = evidence.filter((e): e is Extract<Evidence,{type:"requirement"}> => e.type === "requirement");
  if (!requirements.length) return { kind, verdict: "UNVERIFIED", reasons: [...reasons, "Project completion requires an explicit requirement set."] };
  if (requirements.some(e => e.verdict === "DISPROVEN")) return { kind, verdict: "DISPROVEN", reasons: [...reasons, "A required outcome is disproven."] };
  if (requirements.some(e => e.verdict !== "PROVEN" || !e.evidenceIds.length)) return { kind, verdict: "UNVERIFIED", reasons: [...reasons, "Not every requirement is proven by evidence."] };
  const tests = verifyClaim("tests-pass", evidence);
  const build = verifyClaim("build-works", evidence);
  if (tests.verdict !== "PROVEN" || build.verdict !== "PROVEN") {
    return { kind, verdict: "UNVERIFIED", reasons: [...reasons, "Requirements are proven, but executable test/build evidence is incomplete."] };
  }
  return { kind, verdict: "PROVEN", reasons: [...reasons, "Requirements, tests and build are all supported by execution evidence."] };
}
