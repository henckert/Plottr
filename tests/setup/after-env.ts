// tests/setup/after-env.ts
// Clean up common leak sources between tests

afterAll(async () => {
  // Ensure all timers are cleared
  jest.useRealTimers();

  // Clear any intervals or timeouts that might be lingering
  const highestId = setTimeout(() => {}, 0) as unknown as number;
  for (let i = 0; i < highestId; i++) {
    clearTimeout(i);
    clearInterval(i);
  }
  clearTimeout(highestId);
});

// Clean up between each test
afterEach(() => {
  // Clear all mocks
  jest.clearAllMocks();
});
