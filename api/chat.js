/**
 * Vercel Edge Function — Direct Claude chat streaming
 * Always on. Works even when Mac is offline.
 */
export const config = { runtime: 'edge' };

const SYSTEM = `You are Claude — Peter's personal AI assistant embedded in MAP HQ, his multi-agent orchestration system running on his Mac Mini.

MAP HQ architecture:
- Chloe (Claude Haiku): plans and coordinates
- Aria (Claude Sonnet — you, in MAP HQ runs): synthesises final output
- Nova workers: route tasks to local Ollama models (deepseek-coder, mistral, llama3, gemma2, phi3.5) or Haiku fallback
- Luna: Ollama-backed local worker
- HR & Legal specialists: auto-review every run for compliance

From this chat, Peter can:
- Type /run <goal> to dispatch a goal directly to MAP HQ on his Mac
- Ask you anything — you have full context of his system

Be concise, direct, and sharp. Use markdown (bold, code blocks, bullets) when it adds clarity. When Peter asks what MAP HQ can do, be specific about the capabilities above. When he asks you to run something, remind him to use /run <goal> or go to the Run tab.`;

export default async function handler(req) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  // Auth — timing-safe comparison to prevent token enumeration attacks
  const expectedToken = process.env.MOBILE_ACCESS_TOKEN;
  if (expectedToken) {
    const auth = req.headers.get('Authorization') || '';
    const qToken = new URL(req.url).searchParams.get('token') || '';
    const provided = auth.startsWith('Bearer ') ? auth.slice(7) : qToken;
    // Pad to same length before comparison to prevent length-based timing leaks
    const a = new TextEncoder().encode(provided.padEnd(64, '\0'));
    const b = new TextEncoder().encode(expectedToken.padEnd(64, '\0'));
    let mismatch = a.length !== b.length ? 1 : 0;
    const len = Math.min(a.length, b.length);
    for (let i = 0; i < len; i++) mismatch |= a[i] ^ b[i];
    if (!provided || mismatch !== 0) {
      return new Response('Unauthorized', { status: 401 });
    }
  }

  let messages;
  try {
    const body = await req.json();
    messages = body.messages || [];
  } catch (e) {
    return new Response('Bad request', { status: 400 });
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    return new Response('Server misconfigured — ANTHROPIC_API_KEY not set', { status: 500 });
  }

  // Call Anthropic with streaming
  const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': anthropicKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: SYSTEM,
      messages,
      stream: true,
    }),
  });

  if (!anthropicRes.ok) {
    const err = await anthropicRes.text();
    return new Response(`Anthropic error: ${err}`, { status: 502 });
  }

  // Transform Anthropic SSE → simple chunk SSE the mobile app expects
  const encoder = new TextEncoder();
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();

  (async () => {
    const reader = anthropicRes.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.type === 'content_block_delta' &&
                parsed.delta?.type === 'text_delta' &&
                parsed.delta.text) {
              await writer.write(
                encoder.encode(`event: chunk\ndata: ${JSON.stringify(parsed.delta.text)}\n\n`)
              );
            }
          } catch (e) { /* skip malformed */ }
        }
      }
      await writer.write(encoder.encode(`event: done\ndata: "done"\n\n`));
    } catch (e) {
      await writer.write(
        encoder.encode(`event: error\ndata: ${JSON.stringify(e.message)}\n\n`)
      );
    } finally {
      writer.close();
    }
  })();

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
