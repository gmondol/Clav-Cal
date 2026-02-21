import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

const SYSTEM_PROMPT = readFileSync(join(process.cwd(), 'src/app/api/chat/STREAMBRAIN.md'), 'utf-8');

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
  }

  const { messages, context } = await req.json();

  const contextMessage = context
    ? `Here's what I know about your content:\n\n${context}\n\nNow let's cook 🔥`
    : '';

  const fullMessages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...(contextMessage ? [{ role: 'system', content: contextMessage }] : []),
    ...messages,
  ];

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: fullMessages,
      temperature: 0.9,
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    return NextResponse.json({ error: err }, { status: response.status });
  }

  const data = await response.json();
  return NextResponse.json({ message: data.choices[0].message.content });
}
