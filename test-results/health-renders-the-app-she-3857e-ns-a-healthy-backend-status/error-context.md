# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: health.spec.ts >> renders the app shell and returns a healthy backend status
- Location: e2e\health.spec.ts:7:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: 'Gilded' })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('heading', { name: 'Gilded' })

```

# Page snapshot

```yaml
- main [ref=e4]:
  - generic [ref=e6]:
    - heading "Sign in" [level=1] [ref=e7]
    - paragraph [ref=e8]: Authenticate with your organization identity provider.
    - button "Sign in with SSO" [ref=e9] [cursor=pointer]
```

# Test source

```ts
  1  | // Acceptance Test
  2  | // Traces to: L1-011, L1-012, L1-014, L1-016
  3  | // Description: The Angular app renders at / and the backend health endpoint responds.
  4  | 
  5  | import { expect, test } from '@playwright/test';
  6  | 
  7  | test('renders the app shell and returns a healthy backend status', async ({ page, request }) => {
  8  |   await page.goto('/');
> 9  |   await expect(page.getByRole('heading', { name: 'Gilded' })).toBeVisible();
     |                                                               ^ Error: expect(locator).toBeVisible() failed
  10 | 
  11 |   const response = await request.get('http://127.0.0.1:3000/health');
  12 |   expect(response.status()).toBe(200);
  13 |   await expect(response.json()).resolves.toEqual({ status: 'ok' });
  14 | });
  15 | 
```