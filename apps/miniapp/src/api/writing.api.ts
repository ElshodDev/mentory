// apps/miniapp/src/api/writing.api.ts

export async function getWritingHelp(userMessage: string): Promise<string> {
  const res = await fetch('/api/writing', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: userMessage }),
  });
  if (!res.ok) {
    throw new Error('API request failed');
  }
  const data = await res.json();
  return data.reply;
}
