# agent-ready Growth Metrics

This log keeps launch work measurable. Record raw numbers, one interpretation, and one next experiment each week.

## Collection Commands

```bash
gh repo view EShener/agent-ready --json stargazerCount,watchers,repositoryTopics
npm view @eshen_fox_mie/agent-ready version
curl -sS https://api.npmjs.org/downloads/point/last-week/%40eshen_fox_mie%2Fagent-ready
gh api graphql -f query='query($owner:String!,$repo:String!){repository(owner:$owner,name:$repo){stargazerCount discussions(first:10,orderBy:{field:UPDATED_AT,direction:DESC}){totalCount nodes{number title url comments{totalCount}}} issues(states:OPEN,first:20){totalCount nodes{number title author{login} url}}}}}' -F owner=EShener -F repo=agent-ready
```

If a source is unavailable, write down the exact unavailable state instead of guessing. For example, npm download stats can lag behind a newly published scoped package.

## Weekly Log

| Week of | GitHub stars | npm latest | npm downloads last 7d | Discussions | Non-maintainer issues | Shipped this week | Next experiment |
| --- | ---: | --- | ---: | ---: | ---: | --- | --- |
| 2026-05-30 | 1 | 0.1.24 | 281 | 1 discussion / 1 comment | 0 | GitLab CI/CircleCI detection, Poetry/PDM/uv detection, ASP.NET Core/.NET test tooling detection, `agent-ready outreach`, targeted external issues: hta218/ai-agents-notifier#49, thomasgauvin/protoagent#2, lutelute/local-cli#4, ObservedObserver/async-code#36 | Fix npm Trusted Publishing, publish v0.1.26, then convert any positive outreach response into a small PR |
| 2026-05-25 | 1 | 0.1.24 | unavailable | 1 discussion / 1 comment | 0 | npm package, launch kit, growth playbook, Next.js/Astro detection, Docker Compose detection, real-world examples | Share the examples gallery and ask for missing detector requests |

## Interpretation Notes

### 2026-05-25

- GitHub has one star, so the current priority is improving the first-visit experience and giving people concrete examples to inspect.
- npm latest is `0.1.24`; newer source changes are on `main`, but automated npm publishing still needs a publish-capable token or Trusted Publishing.
- npm download stats are recorded as unavailable because the downloads API returned `package not found` while `npm view` confirmed the package exists.
- The strongest near-term growth path is not broad promotion. It is targeted proof: examples, GIFs, detector requests, and small public updates tied to shipped changes.

### 2026-05-30

- npm download stats are now available: 281 downloads for 2026-05-23 through 2026-05-29.
- Main branch has a stronger v0.1.26 story: broader detector coverage plus `agent-ready outreach` for repo-specific maintainer drafts.
- Targeted outreach opened four concrete external issues:
  `hta218/ai-agents-notifier#49`, `thomasgauvin/protoagent#2`, `lutelute/local-cli#4`, and `ObservedObserver/async-code#36`.
  Each issue is repo-specific and focused on agent handoff, safety, and verification guidance rather than a generic star request.
- Outreach uncovered and fixed a local product improvement: stale-path detection now ignores user-home install destinations such as `~/.claude/settings.json`; tracked as `EShener/agent-ready#27`.
