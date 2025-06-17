export const runClaude = async (input: string) => {
  console.log('[Claude Stub] Received input:', input);
  return {
    success: true,
    provider: 'claude',
    model: 'claude-3-sonnet',
    output: `Claude is currently offline. This is a stubbed response for input: ${input}`,
    tokensUsed: 42
  };
};