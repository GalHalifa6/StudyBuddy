# StudyBuddy Test Suite

This directory contains comprehensive unit and integration tests for the StudyBuddy application.

## Test Structure

```
src/test/java/com/studybuddy/test/
├── config/
│   └── TestConfig.java          # Shared test configuration
├── unit/                         # Unit tests (isolated, mocked dependencies)
│   ├── controller/
│   │   ├── AuthControllerTest.java
│   │   └── GroupControllerTest.java
│   ├── service/
│   │   └── NotificationServiceTest.java
│   └── security/
│       └── JwtUtilsTest.java
└── integration/                  # Integration tests (full Spring context)
    ├── AuthIntegrationTest.java
    ├── GroupIntegrationTest.java
    └── CourseIntegrationTest.java
```

## Running Tests

### Run All Tests
```bash
mvn test
```

### Run Only Unit Tests
```bash
mvn test -Dtest=com.studybuddy.test.unit.*
```

### Run Only Integration Tests
```bash
mvn test -Dtest=com.studybuddy.test.integration.*
```

### Run Specific Test Class
```bash
mvn test -Dtest=AuthControllerTest
```

### Run Tests with Coverage
```bash
mvn test jacoco:report
```

## Test Configuration

Tests use a separate configuration file: `src/test/resources/application-test.properties`

Key differences from production:
- In-memory H2 database (data is cleared between tests)
- Test JWT secret
- Reduced logging
- Test upload directory

## Test Categories

### Unit Tests
- **Purpose**: Test individual components in isolation
- **Dependencies**: Mocked using Mockito
- **Speed**: Fast execution
- **Coverage**: Controllers, Services, Utilities

### Integration Tests
- **Purpose**: Test full request/response cycle through the application
- **Dependencies**: Real Spring context, in-memory database
- **Speed**: Slower than unit tests
- **Coverage**: API endpoints, database interactions, security

## Writing New Tests

### Unit Test Template
```java
@ExtendWith(MockitoExtension.class)
class MyControllerTest {
    @Mock
    private MyRepository repository;
    
    @InjectMocks
    private MyController controller;
    
    @Test
    void testMethod_Success() {
        // Arrange
        when(repository.findById(anyLong())).thenReturn(Optional.of(testEntity));
        
        // Act
        ResponseEntity<?> response = controller.getEntity(1L);
        
        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
    }
}
```

### Integration Test Template
```java
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class MyIntegrationTest {
    @Autowired
    private MockMvc mockMvc;
    
    @Autowired
    private MyRepository repository;
    
    @Test
    @WithMockUser(username = "testuser")
    void testEndpoint_Success() throws Exception {
        mockMvc.perform(get("/api/endpoint"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.field").value("expected"));
    }
}
```

## Best Practices

1. **Test Naming**: Use descriptive names: `testMethodName_Scenario_ExpectedResult`
2. **Arrange-Act-Assert**: Structure tests clearly
3. **Isolation**: Each test should be independent
4. **Cleanup**: Use `@Transactional` or `@BeforeEach` cleanup
5. **Mocking**: Mock external dependencies, not the class under test
6. **Assertions**: Use specific assertions, not just `assertNotNull`

## Test Coverage Goals

- **Unit Tests**: 80%+ coverage for business logic
- **Integration Tests**: Cover all major user flows
- **Critical Paths**: 100% coverage for authentication, authorization, payments

## Continuous Integration

Tests run automatically on:
- Pull requests
- Before merging to main
- Before deployment

## Troubleshooting

### Tests Fail with Database Errors
- Ensure `application-test.properties` is configured correctly
- Check that `@Transactional` is used for cleanup

### Security Tests Fail
- Use `@WithMockUser` for authenticated endpoints
- Check that security configuration allows test endpoints

### MockMvc Not Found
- Ensure `@AutoConfigureMockMvc` is present
- Check that `spring-boot-starter-test` is in dependencies

## Maintenance

- Update tests when adding new features
- Refactor tests when refactoring code
- Remove obsolete tests
- Keep test data realistic but minimal



