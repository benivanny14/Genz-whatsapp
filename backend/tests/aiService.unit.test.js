const aiService = require('../services/aiService');

describe('aiService (P3 OpenAI-compatible provider)', () => {
  afterEach(() => {
    delete process.env.AI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.AI_DISABLED;
    delete process.env.AI_BASE_URL;
    delete process.env.AI_MODEL;
    delete process.env.AI_PROVIDER;
  });

  test('isEnabled() is false without credentials', () => {
    expect(aiService.isEnabled()).toBe(false);
  });

  test('isEnabled() is true when AI_API_KEY is set', () => {
    process.env.AI_API_KEY = 'test-key';
    expect(aiService.isEnabled()).toBe(true);
  });

  test('isEnabled() honors OPENAI_API_KEY and AI_DISABLED', () => {
    expect(aiService.isEnabled()).toBe(false);
    process.env.OPENAI_API_KEY = 'test-key';
    expect(aiService.isEnabled()).toBe(true);
    process.env.AI_DISABLED = '1';
    expect(aiService.isEnabled()).toBe(false);
  });

  test('completeChat() returns a labeled dev-mode mock without credentials', async () => {
    const result = await aiService.completeChat({
      messages: [{ role: 'user', content: 'Hello' }]
    });
    expect(result.mock).toBe(true);
    expect(result.provider).toBe('dev-mode');
    expect(result.content).toContain('DEV MODE');
    expect(result.content).toContain('Hello');
  });

  test('completeChat() throws when no messages are provided', async () => {
    await expect(aiService.completeChat({ messages: [] })).rejects.toThrow(
      'No chat messages provided'
    );
  });

  test('completeChat() includes the system prompt in the mock note', async () => {
    const result = await aiService.completeChat({
      system: 'You are a friendly assistant',
      messages: [{ role: 'user', content: 'Hi' }]
    });
    expect(result.mock).toBe(true);
    expect(result.content).toContain('friendly assistant');
  });
});
