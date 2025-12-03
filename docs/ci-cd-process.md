# Barter Vibe CI/CD Pipeline

This document describes the Continuous Integration and Continuous Deployment pipeline for the Barter Vibe project.

## Overview

The CI/CD pipeline is implemented using GitHub Actions and consists of the following main components:

1. **Continuous Integration (CI)**: Automated testing and code quality checks
2. **Security Scanning**: Vulnerability detection and dependency scanning
3. **Build Pipeline**: Docker image building and publishing
4. **Deployment**: Automated deployment to staging and production environments

## Workflows

### 1. CI Pipeline (`ci.yml`)

Triggered on:
- Push to `main` or `develop` branches
- Pull Requests to `main`

Steps:
- Checkout code
- Setup Node.js environment
- Install dependencies
- Run linting checks
- Execute unit and integration tests
- Generate and upload test coverage reports

### 2. Security Scanning (`security.yml`)

Triggered on:
- Push to `main` or `develop` branches
- Pull Requests to `main`
- Weekly schedule (for continuous monitoring)

Steps:
- Run `npm audit` for dependency vulnerabilities
- Run Snyk for security scanning
- Run CodeQL for code analysis

### 3. Dependency Review (`dependency-review.yml`)

Triggered on:
- Pull Request events

Steps:
- Analyze dependency changes in pull requests
- Report security vulnerabilities in new dependencies

### 4. Docker Build (`docker.yml`)

Triggered on:
- Push to `main` or `develop` branches

Steps:
- Build multi-stage Docker image
- Push image to GitHub Container Registry
- Tag with branch and commit hash

### 5. Deployment Pipeline

**Staging Deployment (`deploy-staging.yml`)**:
- Triggered on push to `develop` branch
- Deploy to staging environment
- Uses GitHub Environments for secrets management

**Production Deployment (`deploy.yml`)**:
- Triggered on push to `main` branch
- Deploy to production environment
- Uses GitHub Environments for secrets management

## Environment Configuration

### GitHub Secrets Required

For deployment workflows, the following secrets should be configured in GitHub Settings:

- `JWT_SECRET`: Secret key for JWT token generation
- `DB_URL`: Database connection string
- `EMAIL_USER`: Email service username
- `EMAIL_PASS`: Email service password
- `SNYK_TOKEN`: Snyk API token (for security scanning)

### GitHub Environments

The pipeline uses GitHub Environments for:
- Storing environment-specific secrets
- Manual approval for production deployments
- Protecting deployment branches

## Build Artifacts

### Docker Images

- Images are built and pushed to GitHub Container Registry (ghcr.io)
- Tagged with branch name and commit SHA
- Multi-stage build for optimized production images

### Test Coverage

- Uploaded to Codecov for tracking coverage trends
- Generated during CI workflow
- Measured at every commit

## Branch Strategy

- `main`: Production branch - auto-deploys to production
- `develop`: Staging branch - auto-deploys to staging
- Feature branches: PRs trigger CI, security, and dependency review workflows

## Local Development

To run the same checks locally:

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run linting
npm run lint

# Run linting with auto-fix
npm run lint:fix

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration
```

## Deployment Process

1. Code changes are pushed to `develop` branch
2. CI pipeline runs automatically
3. Manual testing on staging environment
4. Code is merged to `main` branch
5. Production deployment triggered automatically
6. Post-deployment health checks performed

## Rollback Process

In case of deployment issues:
1. Revert to previous stable deployment using Docker image tags
2. Monitor application health
3. Investigate and fix issues in a feature branch
4. Deploy fix through normal process

## Pipeline Status

To monitor pipeline status:
1. Check GitHub Actions tab in repository
2. Monitor deployed application health endpoints
3. Review logs in application monitoring system