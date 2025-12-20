# Frontend Testing Guide

## Quick Start

```bash
# Install dependencies (includes testing libraries)
npm install

# Run tests
npm run test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui
```

## Test Structure

```
frontend/
├── src/
│   ├── test/                    # Test utilities and setup
│   │   ├── setup.ts            # Global test setup
│   │   ├── utils/              # Test utilities
│   │   │   ├── test-utils.tsx  # Custom render with providers
│   │   │   └── index.ts        # Exports
│   │   ├── mocks/              # Mock data and API handlers
│   │   │   ├── handlers.ts     # MSW request handlers
│   │   │   ├── server.ts       # MSW server setup
│   │   │   └── mockData.ts     # Reusable mock data
│   │   └── README.md           # Detailed testing docs
│   │
│   ├── components/
│   │   └── __tests__/          # Component tests
│   ├── pages/
│   │   └── __tests__/          # Page tests
│   └── api/
│       └── __tests__/          # API service tests
│
├── vitest.config.ts            # Vitest configuration
└── TESTING.md                   # This file
```

## Writing Tests

### Component Test Example

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

### Testing with User Interactions

```tsx
import userEvent from '@testing-library/user-event';

it('handles button click', async () => {
  const user = userEvent.setup();
  renderWithProviders(<MyComponent />);
  
  const button = screen.getByRole('button', { name: /submit/i });
  await user.click(button);
  
  expect(screen.getByText('Submitted')).toBeInTheDocument();
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
  
  expect(screen.getByText('Protected Content')).toBeInTheDocument();
});
```

### Testing API Calls

```tsx
import { describe, it, expect, vi } from 'vitest';
import { authService } from '../auth';

// Mock the API
vi.mock('../api/axios', () => ({
  default: {
    post: vi.fn(),
  },
}));

it('calls API correctly', async () => {
  // Test implementation
});
```

## Test Coverage Goals

- **Components**: Rendering, interactions, state changes
- **Pages**: Routing, data fetching, error handling
- **API Services**: Request/response handling
- **Hooks**: Custom hook logic
- **Utils**: Utility functions

## Best Practices

1. ✅ Use `renderWithProviders` for components needing context
2. ✅ Use mock data from `mockData.ts` for consistency
3. ✅ Test user interactions with `@testing-library/user-event`
4. ✅ Keep tests focused - one assertion per test when possible
5. ✅ Use descriptive test names - "should do X when Y"
6. ✅ Mock external dependencies (API, WebSocket, etc.)

## Future Enhancements

As the project grows, consider:

- **E2E Tests**: Playwright or Cypress for full user flows
- **Visual Regression**: Chromatic or Percy
- **Performance Tests**: Lighthouse CI
- **Accessibility Tests**: jest-axe

## Troubleshooting

### Tests not finding modules
- Check `vitest.config.ts` path aliases match `tsconfig.json`
- Ensure imports use `@/` alias

### MSW not intercepting requests
- Verify `server.ts` is imported in `setup.ts`
- Check handlers are added to `handlers.ts`

### Type errors in tests
- Ensure `vitest.d.ts` is included
- Check TypeScript includes test files

## Resources

- [Vitest Docs](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [MSW Docs](https://mswjs.io/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)


