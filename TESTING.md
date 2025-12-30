# Testing Guide

This document provides an overview of the testing setup and how to run tests for the TIPA application.

## Setup

The project uses:
- **Jest** - Testing framework
- **React Testing Library** - Component testing utilities
- **@testing-library/jest-dom** - Custom Jest matchers for DOM testing

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (useful during development)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## Test Structure

Tests are organized in the `__tests__` directory mirroring the source structure:

```
__tests__/
├── api/
│   ├── auth/
│   │   ├── login.test.ts
│   │   └── change-password.test.ts
│   ├── admin/
│   │   └── invite-member.test.ts
│   └── profile/
│       └── route.test.ts
├── components/
│   ├── Navbar.test.tsx
│   └── ProfilePictureUpload.test.tsx
└── lib/
    ├── auth.test.ts
    └── google-sheets.test.ts
```

## Writing Tests

### API Route Tests

API routes are tested by importing the route handler and calling it with mock `NextRequest` objects:

```typescript
import { POST } from '@/app/api/auth/login/route'
import { NextRequest } from 'next/server'

describe('/api/auth/login', () => {
  it('should return 400 if email is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ password: 'password123' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('email')
  })
})
```

### Component Tests

Components are tested using React Testing Library:

```typescript
import { render, screen } from '@testing-library/react'
import MyComponent from '@/components/MyComponent'

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })
})
```

### Utility Function Tests

Utility functions are tested directly:

```typescript
import { myFunction } from '@/lib/my-utils'

describe('myFunction', () => {
  it('should return expected result', () => {
    const result = myFunction('input')
    expect(result).toBe('expected output')
  })
})
```

## Mocking

### Supabase

Supabase clients are mocked in `jest.setup.js`. You can override mocks in individual tests:

```typescript
const { createClient } = require('@/lib/supabase/server')
const mockSupabase = {
  auth: {
    getUser: jest.fn().mockResolvedValue({
      data: { user: mockUser },
    }),
  },
}
createClient.mockResolvedValue(mockSupabase)
```

### Next.js Router

The Next.js router is automatically mocked in `jest.setup.js`. No additional setup needed.

### Environment Variables

Environment variables are mocked in `jest.setup.js`. Override in tests if needed:

```typescript
process.env.MY_VAR = 'test-value'
```

## Coverage Goals

- **API Routes**: 80%+ coverage
- **Components**: 70%+ coverage
- **Utility Functions**: 90%+ coverage

## Best Practices

1. **Test behavior, not implementation** - Focus on what the code does, not how it does it
2. **Use descriptive test names** - Test names should clearly describe what is being tested
3. **Keep tests isolated** - Each test should be independent and not rely on other tests
4. **Mock external dependencies** - Mock Supabase, API calls, and other external services
5. **Test error cases** - Don't just test happy paths, test error handling too
6. **Use async/await properly** - Use `waitFor` for async operations in component tests

## Continuous Integration

Tests should be run as part of the CI/CD pipeline. Add to your CI configuration:

```yaml
- run: npm test
- run: npm run test:coverage
```

## Troubleshooting

### Tests failing with "Cannot find module"

Make sure all dependencies are installed:
```bash
npm install
```

### Tests timing out

Increase the timeout in `jest.config.js`:
```javascript
testTimeout: 10000, // 10 seconds
```

### Mock not working

Ensure mocks are set up before the module is imported, or use `jest.mock()` at the top of your test file.

