export const runMistral = async (input: string) => {
  console.log('[Mistral Stub] Received input:', input);
  return {
    success: true,
    provider: 'mistral',
    model: 'mistral-medium',
    output: `Mistral is currently offline. This is a stubbed response for input: ${input}`,
    tokensUsed: 37
  };
};