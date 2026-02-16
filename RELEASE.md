# Release Process

This repository uses an automated release process with semantic versioning.

## Automated Releases

Releases are automatically created when commits are pushed to the `main` branch. The version number is determined by analyzing commit messages using [Conventional Commits](https://www.conventionalcommits.org/).

### Commit Message Format

To trigger an automatic release, use conventional commit messages:

- **Breaking Changes** (Major version bump): 
  ```
  feat!: change API endpoint structure
  
  BREAKING CHANGE: The API endpoint structure has been completely redesigned
  ```

- **New Features** (Minor version bump):
  ```
  feat: add new screen sharing mode
  feat(ui): add dark mode toggle
  ```

- **Bug Fixes** (Patch version bump):
  ```
  fix: resolve crash on startup
  fix(updater): correct version check logic
  ```

### Semantic Versioning

The project follows [Semantic Versioning](https://semver.org/) (MAJOR.MINOR.PATCH):

- **MAJOR**: Breaking changes (e.g., 1.0.0 → 2.0.0)
- **MINOR**: New features, backwards compatible (e.g., 1.0.0 → 1.1.0)
- **PATCH**: Bug fixes, backwards compatible (e.g., 1.0.0 → 1.0.1)

### Workflow

1. Commits are pushed to the `main` branch
2. The CI/CD workflow analyzes commit messages
3. If a conventional commit is found, a new version is calculated
4. The application is built for all platforms (Windows, macOS, Linux)
5. A GitHub release is created with the new version tag
6. Build artifacts are uploaded to the release

### Manual Releases

To trigger a manual release:

1. Go to the Actions tab in GitHub
2. Select "Auto Release" workflow
3. Click "Run workflow"
4. Select the branch (usually `main`)

## Auto-Updates

The application includes an auto-updater powered by `electron-updater`. When a new release is published:

1. The application checks for updates automatically
2. Users are notified when an update is available
3. Users can choose to download and install the update
4. The application will restart with the new version

### Update Configuration

The auto-updater is configured to:
- Check for updates from the GitHub releases
- Download updates in the background
- Notify users before installing
- Support update snoozing and ignoring specific versions

## Development Workflow

For contributors:

1. Create a feature branch from `main`
2. Make your changes
3. Use conventional commit messages
4. Create a pull request to `main`
5. After merge, the release workflow will automatically create a new version

## Testing Releases

To test the release process without publishing:

1. Modify the workflow to use a test branch
2. Set `draft: true` in the release creation step
3. Verify the build artifacts are correct
4. Delete the draft release when done
