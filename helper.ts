export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function fetchWithRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await operation();
    } catch (error: any) {
      const isRateLimited = error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('RESOURCE_EXHAUSTED');
      if (isRateLimited) {
        attempt++;
        if (attempt >= maxRetries) {
          throw new Error("AI service is temporarily unavailable. Please try again later.");
        }
        const waitTime = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
        console.log(`429 Too Many Requests, retrying in ${waitTime}ms...`);
        await delay(waitTime);
      } else {
        throw error;
      }
    }
  }
  throw new Error("Max retries exceeded");
}
