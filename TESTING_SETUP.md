# Testing Setup Guide

This guide explains how to set up and run tests in the StudyBuddy project.

## Prerequisites

### Frontend
- Node.js 18+
- npm or yarn

### Backend
- Java 17+
- Maven 3.6+

## Initial Setup

### Frontend Setup

1. Install dependencies:
```bash
cd frontend
npm install
```

2. Install coverage tool (if not already installed):
```bash
npm install --save-dev @vitest/coverage-v8
```

### Backend Setup

1. Maven will automatically download dependencies on first run
2. Test configuration is in `src/test/resources/application-test.properties`

## Running Tests

### Frontend Tests

```bash
cd frontend

# Run tests in watch mode (development)
npm test

# Run tests once
npm run test:run

# Run tests with coverage
npm run test:coverage

# Run tests in CI mode (for CI/CD)
npm run test:ci
```

### Backend Tests

```bash
# Run all tests
mvn test

# Run specific test class
mvn test -Dtest=AuthControllerTest

# Run tests with coverage
mvn clean test jacoco:report

# View coverage report
# Open: target/site/jacoco/index.html
```

## Pre-commit Hooks

Pre-commit hooks are set up to run tests before each commit.

### Setup Husky (if not already set up)

```bash
cd frontend
npm install --save-dev husky
npx husky install
```

The pre-commit hook will:
1. Run frontend tests
2. Run backend tests
3. Block commit if tests fail

### Bypassing Pre-commit (Not Recommended)

```bash
git commit --no-verify
```

## CI/CD Pipeline

Tests run automatically on:
- Push to `main` or `develop` branches
- Pull requests

### GitHub Actions Workflow

The CI pipeline (`.github/workflows/ci.yml`) runs:
1. Backend tests with coverage
2. Frontend tests with coverage
3. Linting
4. Build verification

### Viewing CI Results

1. Go to GitHub repository
2. Click "Actions" tab
3. View latest workflow run

## Test Coverage

### Frontend Coverage

Coverage reports are generated in `frontend/coverage/`:
- HTML report: `coverage/index.html`
- LCOV report: `coverage/lcov.info`

### Backend Coverage

Coverage reports are generated in `target/site/jacoco/`:
- HTML report: `target/site/jacoco/index.html`
- XML report: `target/site/jacoco/jacoco.xml`

### Coverage Thresholds

- Minimum: 70% for all metrics
- Critical paths: 90%+

## Troubleshooting

### Frontend Tests Failing

1. Clear node_modules and reinstall:
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

2. Clear Vitest cache:
```bash
rm -rf frontend/node_modules/.vite
```

### Backend Tests Failing

1. Clean Maven cache:
```bash
mvn clean
```

2. Verify test database configuration:
```bash
# Check: src/test/resources/application-test.properties
```

3. Check for port conflicts (if using embedded server)

### Pre-commit Hook Not Working

1. Verify Husky is installed:
```bash
ls -la .husky
```

2. Reinstall Husky:
```bash
cd frontend
npx husky install
```

3. Make hook executable (Linux/Mac):
```bash
chmod +x .husky/pre-commit
```

## Best Practices

1. **Run tests before committing**: Use pre-commit hooks
2. **Write tests first**: TDD approach for new features
3. **Keep tests fast**: Mock external dependencies
4. **Test edge cases**: Don't just test happy paths
5. **Maintain coverage**: Aim for 70%+ coverage
6. **Review test failures**: Fix or update tests when code changes

## Additional Resources

- See `TEST_QUALITY_GUIDE.md` for testing standards
- See `README.md` for project overview
- See `QUICKSTART.md` for quick start guide

