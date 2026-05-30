export function ciWorkflowFiles(ci = {}) {
  return [
    ...(ci.githubActions || []),
    ...(ci.gitlabCi || []),
    ...(ci.circleCi || []),
  ].filter(Boolean);
}

export function hasCiWorkflows(ci = {}) {
  return ciWorkflowFiles(ci).length > 0;
}

export function formatCiWorkflows(ci = {}, fallback = "No CI workflows detected") {
  const files = ciWorkflowFiles(ci);
  return files.length ? files.join(", ") : fallback;
}
