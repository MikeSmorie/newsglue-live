export function estimateContentLength(text: string): number {
  return text.trim().length;
}

export function truncateText(text: string, limit: number): string {
  return text.length <= limit ? text : text.substring(0, limit - 3) + '...';
}