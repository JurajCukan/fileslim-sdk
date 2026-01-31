# Publishing Guide for @fileslim/compress

This document outlines the steps to publish the FileSlim SDK to npm.

## Prerequisites

1. **npm Account**: Create an account at [npmjs.com](https://www.npmjs.com/)
2. **npm CLI**: Ensure you have npm installed (`npm --version`)
3. **Authentication**: Login to npm (`npm login`)

## Pre-publish Checklist

Before publishing, verify the following:

### 1. Version Number

Update the version in `package.json` following [Semantic Versioning](https://semver.org/):

- **MAJOR** (1.0.0 → 2.0.0): Breaking API changes
- **MINOR** (1.0.0 → 1.1.0): New features, backward compatible
- **PATCH** (1.0.0 → 1.0.1): Bug fixes, backward compatible

```bash
# Bump version automatically
npm version patch  # 1.0.0 → 1.0.1
npm version minor  # 1.0.0 → 1.1.0
npm version major  # 1.0.0 → 2.0.0
```

### 2. Build the SDK

```bash
cd sdk
npm install
npm run build
```

Verify the `dist/` folder contains:
- `index.js` (ES Module)
- `index.cjs` (CommonJS)
- `index.umd.js` (UMD for browsers)
- `index.d.ts` (TypeScript definitions)

### 3. Test the Build

```bash
# Test in a separate project
mkdir /tmp/test-fileslim
cd /tmp/test-fileslim
npm init -y
npm install /path/to/fileslim/sdk

# Create test file
cat > test.js << 'EOF'
const { compressImage, VERSION } = require('@fileslim/compress');
console.log('SDK Version:', VERSION);
console.log('compressImage:', typeof compressImage);
EOF

node test.js
```

### 4. Update CHANGELOG.md

Document all changes since the last release.

### 5. Verify package.json

Ensure these fields are correct:

```json
{
  "name": "@fileslim/compress",
  "version": "1.0.0",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "files": ["dist", "README.md", "LICENSE"]
}
```

## Publishing

### First-time Setup (Scoped Package)

If this is a scoped package (`@fileslim/compress`), you need an npm organization:

1. Go to [npmjs.com/org/create](https://www.npmjs.com/org/create)
2. Create the `fileslim` organization
3. Or publish as unscoped: rename to `fileslim-compress`

### Publish Commands

```bash
cd sdk

# Dry run (see what would be published)
npm publish --dry-run

# Publish to npm (public scoped package)
npm publish --access public

# Publish with a tag (e.g., beta)
npm publish --access public --tag beta
```

### Verify Publication

```bash
# Check the package on npm
npm view @fileslim/compress

# Install in a new project to verify
npm install @fileslim/compress
```

## Post-publish

### 1. Create Git Tag

```bash
git tag v1.0.0
git push origin v1.0.0
```

### 2. Create GitHub Release

1. Go to GitHub repository → Releases → Create new release
2. Select the tag you just created
3. Copy relevant CHANGELOG.md content
4. Attach the dist files if desired

### 3. Update Documentation

- Update any version references in documentation
- Update CDN links with new version number

## CDN Distribution

After publishing, the package is automatically available on CDNs:

```html
<!-- unpkg -->
<script src="https://unpkg.com/@fileslim/compress@1.0.0/dist/index.umd.js"></script>

<!-- jsDelivr -->
<script src="https://cdn.jsdelivr.net/npm/@fileslim/compress@1.0.0/dist/index.umd.js"></script>
```

## Troubleshooting

### "You must be logged in to publish packages"

```bash
npm login
```

### "Package name already exists"

Choose a different name or request transfer from the current owner.

### "You do not have permission to publish"

For scoped packages, ensure you have publish access to the organization.

### "Cannot publish over existing version"

You cannot republish the same version. Bump the version number first.

## Unpublishing

**Warning**: Unpublishing affects users who depend on your package.

```bash
# Unpublish a specific version (within 72 hours)
npm unpublish @fileslim/compress@1.0.0

# Deprecate instead (recommended)
npm deprecate @fileslim/compress@1.0.0 "Critical bug, please upgrade to 1.0.1"
```

## Automation (Optional)

### GitHub Actions Workflow

Create `.github/workflows/publish.yml`:

```yaml
name: Publish to npm

on:
  release:
    types: [published]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          registry-url: 'https://registry.npmjs.org'
      - run: cd sdk && npm ci
      - run: cd sdk && npm run build
      - run: cd sdk && npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

Add `NPM_TOKEN` to your repository secrets (Settings → Secrets → Actions).

## Contact

For publishing issues, contact the FileSlim team or open an issue on GitHub.
