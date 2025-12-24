# Frontend Testing Guide

This directory contains all testing utilities, mocks, and example tests for the StudyBuddy frontend.

## Structure

```
src/test/
├── setup.ts              # Vitest setup and global mocks
├── utils/
│   ├── test-utils.tsx    # Custom render functions with providers
│   └── index.ts          # Central export point
├── mocks/
│   ├── handlers.ts        # MSW request handlers for API mocking
│   ├── server.ts          # MSW server setup
│   └── mockData.ts        # Reusable mock data
└── README.md             # This file
```

## Running Tests

```bash
# Run tests in watch mode
npm run test

# Run tests once
npm run test:run

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## Writing Tests

### Component Tests

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/utils';
import MyComponent from '../MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    renderWithProviders(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

### Testing with Authentication

```tsx
import { renderWithProviders, mockUser } from '@/test/utils';

it('shows content for authenticated user', () => {
  renderWithProviders(<Component />, {
    initialAuthState: {
      user: mockUser,
      isAuthenticated: true,
    },
  });
});
```

### Testing API Calls

```tsx
import { describe, it, expect, vi } from 'vitest';
import { authService } from '../auth';

// Mock the API module
vi.mock('../api/axios', () => ({
  default: {
    post: vi.fn(),
  },
}));

it('calls API correctly', async () => {
  // Test implementation
});
```

### Using MSW for API Mocking

MSW (Mock Service Worker) is set up to intercept API calls during tests. Add new handlers in `mocks/handlers.ts`:

```tsx
http.get('/api/groups/:id', ({ params }) => {
  return HttpResponse.json({
    id: params.id,
    name: 'Test Group',
  });
});
```

## Best Practices

1. **Use `renderWithProviders`** for components that need context
2. **Use mock data** from `mockData.ts` for consistency
3. **Test user interactions** with `@testing-library/user-event`
4. **Keep tests focused** - one assertion per test when possible
5. **Use descriptive test names** - "should do X when Y"
6. **Mock external dependencies** - API calls, WebSocket, etc.

## Test Coverage Goals

- **Components**: Test rendering, user interactions, and state changes
- **Pages**: Test routing, data fetching, and error handling
- **API Services**: Test request/response handling
- **Hooks**: Test custom hook logic
- **Utils**: Test utility functions

## Future Enhancements

As the project grows, consider adding:

- **E2E Tests**: Using Playwright or Cypress
- **Visual Regression Tests**: Using Chromatic or Percy
- **Performance Tests**: Using Lighthouse CI
- **Accessibility Tests**: Using jest-axe







