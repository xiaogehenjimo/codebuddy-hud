# Releasing

1. Update `package.json` version.
2. Update `.codebuddy-plugin/plugin.json` version.
3. Run checks:

```bash
npm run build
npm test
npm run test:stdin
```

4. Commit with a release message.
5. Tag the release:

```bash
git tag v0.1.0
git push origin main --tags
```

6. Create a GitHub release with notable changes and compatibility notes.
