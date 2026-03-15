# Test Quality Guide

This document outlines the testing standards and best practices for the StudyBuddy project.

## Test Structure

### Frontend Tests (Vitest + React Testing Library)
- **Location**: `frontend/src/**/__tests__/`
- **Naming**: `*.test.tsx` or `*.test.ts`
- **Framework**: Vitest with React Testing Library

### Backend Tests (JUnit 5 + Mockito)
- **Location**: `src/test/java/com/studybuddy/test/`
- **Structure**:
  - `unit/` - Unit tests with mocked dependencies
  - `integration/` - Integration tests with full Spring context
- **Naming**: `*Test.java` or `*Tests.java`

## Test Quality Standards

### 1. Test Organization

#### Frontend Tests
- Use `describe` blocks to group related tests
- Use descriptive test names that explain what is being tested
- Follow AAA pattern: Arrange, Act, Assert

```typescript
describe('ComponentName', () => {
  describe('Feature Name', () => {
    it('should do something when condition is met', () => {
      // Arrange
      // Act
      // Assert
    });
  });
});
```

#### Backend Tests
- Use `@BeforeEach` for test setup
- Group related tests in the same class
- Use descriptive method names: `testMethodName_Scenario_ExpectedResult`

```java
@Test
void testRegisterUser_UsernameAlreadyExists_ReturnsBadRequest() {
    // Arrange
    // Act
    // Assert
}
```

### 2. Test Coverage Requirements

- **Minimum Coverage**: 70% for lines, functions, branches, and statements
- **Critical Paths**: 90%+ coverage for authentication, authorization, and payment flows
- **New Code**: Must have tests before merging

### 3. Test Isolation

- Each test should be independent
- Use `beforeEach`/`afterEach` to reset state
- Don't rely on test execution order
- Clean up resources (mocks, timers, etc.)

### 4. Assertions

#### Frontend
- Use specific assertions: `toBeInTheDocument()`, `toHaveTextContent()`
- Test user interactions, not implementation details
- Verify error states and edge cases

#### Backend
- Use JUnit 5 assertions: `assertEquals()`, `assertNotNull()`, `assertTrue()`
- Verify both success and failure paths
- Check return values, status codes, and side effects

### 5. Mocking Best Practices

#### Frontend
- Mock external dependencies (API calls, context providers)
- Use MSW (Mock Service Worker) for API mocking
- Mock only what's necessary

#### Backend
- Use Mockito for unit tests
- Use `@Mock` for dependencies
- Use `@InjectMocks` for the class under test
- Verify interactions when necessary

### 6. Edge Cases and Error Handling

Always test:
- Empty/null inputs
- Invalid inputs
- Network errors
- Timeout scenarios
- Boundary conditions
- Concurrent operations (where applicable)

### 7. Integration Tests

- Test full request/response cycles
- Use `@SpringBootTest` for Spring context
- Use `@Transactional` to isolate test data
- Test with real database (H2 in-memory for tests)

### 8. Performance Considerations

- Tests should run quickly (< 1 second per test)
- Use `@DirtiesContext` sparingly
- Avoid unnecessary database operations
- Use test profiles for configuration

## Running Tests

### Frontend
```bash
cd frontend
npm test              # Watch mode
npm run test:run      # Run once
npm run test:coverage # With coverage
```

### Backend
```bash
mvn test              # Run all tests
mvn test -Dtest=*Test # Run specific test class
mvn jacoco:report     # Generate coverage report
```

## CI/CD Integration

Tests run automatically on:
- Every push to `main` or `develop`
- Every pull request
- Pre-commit hooks (local)

## Test Maintenance

- Update tests when changing functionality
- Remove obsolete tests
- Refactor tests when code is refactored
- Keep test data up to date
- Review test coverage regularly

## Common Issues to Avoid

1. **Flaky Tests**: Tests that sometimes pass/fail
   - Fix: Remove timing dependencies, use proper waits

2. **Slow Tests**: Tests that take too long
   - Fix: Use mocks, avoid real network calls

3. **Brittle Tests**: Tests that break with minor changes
   - Fix: Test behavior, not implementation

4. **Missing Assertions**: Tests without proper checks
   - Fix: Always verify expected outcomes

5. **Test Duplication**: Repeated test code
   - Fix: Use helper functions and test utilities

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [JUnit 5 User Guide](https://junit.org/junit5/docs/current/user-guide/)
- [Mockito Documentation](https://javadoc.io/doc/org.mockito/mockito-core/latest/org/mockito/Mockito.html)

