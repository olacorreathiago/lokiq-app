import Anthropic from '@anthropic-ai/sdk'

const MODEL = 'claude-haiku-4-5-20241022'
const anthropic = new Anthropic()

interface GenerateOptions {
  systemPrompt: string
  userMessage: string
  maxTokens?: number
}

export async function generate({ systemPrompt, userMessage, maxTokens = 1024 }: GenerateOptions) {
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system: [
      {
        type: 'text',
        text: systemPrompt,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [{ role: 'user', content: userMessage }],
  })

  const block = response.content[0]
  if (block?.type !== 'text') {
    throw new Error('Unexpected response type from Claude')
  }

  return {
    text: block.text,
    usage: response.usage,
  }
}
