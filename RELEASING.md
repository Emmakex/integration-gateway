# Releasing Integration Gateway

Use this procedure for tagged stable releases.

## Pre-release

1. Update `package.json` version.
2. Update `CHANGELOG.md` and README version references.
3. Run `npm install --package-lock-only` with the documented Node/npm toolchain when dependency metadata changes.
4. Run:

   ```bash
   npm ci
   npm run verify
   npm audit --audit-level=high
   ```

5. Run the compiled HTTP smoke suite with the same opt-in fictional configuration used by CI.
6. Review `docs/PRODUCTION-CHECKLIST.md` for any newly introduced production-boundary changes.
7. Confirm no real credentials, endpoints or customer payloads exist in the release diff/history.

## Pull request

Release changes go through a focused PR against `main`. Do not tag a commit until required CI checks are green.

## Tag and GitHub release

After the release PR is merged:

1. create an annotated `vX.Y.Z` tag pointing at the verified `main` commit;
2. publish a GitHub Release using the matching changelog section;
3. link to security/support documentation;
4. verify the public repository metadata, license detection and CI status.

The npm package remains `private: true`: the project is distributed as a source repository/starter, not as an automatically published npm package.
