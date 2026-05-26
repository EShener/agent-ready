# npm Publishing

`agent-ready` is published as `@eshen_fox_mie/agent-ready`.

Automated publishing should use npm Trusted Publishing instead of a long-lived `NPM_TOKEN`. Trusted Publishing uses GitHub Actions OIDC and avoids one-time-password failures from token-based publishes.

Official npm docs: https://docs.npmjs.com/trusted-publishers/

## Required npm Package Settings

Configure a trusted publisher on npmjs.com for:

- Package: `@eshen_fox_mie/agent-ready`
- Publisher: GitHub Actions
- Organization or user: `EShener`
- Repository: `agent-ready`
- Workflow filename: `npm-publish.yml`
- Allowed action: `npm publish`

The workflow file must exist at `.github/workflows/npm-publish.yml`.

## Repository Workflow Requirements

The publish workflow should:

- grant `id-token: write`
- use a Node/npm version supported by npm Trusted Publishing
- run repository checks before publish
- call `npm publish --access public` without `NODE_AUTH_TOKEN`

The current workflow publishes only after a GitHub Release is published, and it skips versions that already exist on npm.

## Verification

Before creating a release:

```bash
npm run check
npm test
npm view @eshen_fox_mie/agent-ready version
```

After the release workflow completes:

```bash
npm view @eshen_fox_mie/agent-ready version
npx --yes @eshen_fox_mie/agent-ready@latest doctor
```

The npm version should match the GitHub release tag without requiring manual web confirmation.
