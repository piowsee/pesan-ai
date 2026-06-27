# Changesets

Use `pnpm changeset` in feature branches to describe release-worthy changes.

When those changes land on `main`, the release workflow opens a version PR that updates `package.json` and `CHANGELOG.md`. Merging that version PR creates the matching Git tag and GitHub release.
