// Models grouped by tier. Edit this list any time: names change, so if one stops working,
// the server just skips it and tries the next model in the same tier.
// paid: true = needs OpenRouter credits (openrouter.ai/credits). Without credits the server skips them.
// To add ANY OpenRouter model without editing this file, set OPENROUTER_MODELS in .env (comma separated).
//   tier "fast" = used by Chat mode, tier "deep" = used by Deep think mode.
export const MODELS = [
  // Google Gemini (key: GEMINI_API_KEY, from aistudio.google.com)
  // Backup only: the server loads the current Gemini list itself on start.
  { id: 'gem-flash-lite', provider: 'gemini', model: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash-Lite', tier: 'fast' },
  { id: 'gem-flash', provider: 'gemini', model: 'gemini-3.6-flash', label: 'Gemini 3.6 Flash', tier: 'fast' },
  { id: 'gem-flash-think', provider: 'gemini', model: 'gemini-3.6-flash', label: 'Gemini 3.6 Flash', tier: 'deep' },

  // Groq (key: GROQ_API_KEY, from console.groq.com)
  { id: 'groq-llama8', provider: 'groq', model: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B', tier: 'fast' },
  { id: 'groq-llama70', provider: 'groq', model: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B', tier: 'fast' },
  { id: 'groq-scout', provider: 'groq', model: 'meta-llama/llama-4-scout-17b-16e-instruct', label: 'Llama 4 Scout', tier: 'fast' },
  { id: 'groq-gptoss120', provider: 'groq', model: 'openai/gpt-oss-120b', label: 'GPT-OSS 120B', tier: 'deep' },
  { id: 'groq-gptoss20', provider: 'groq', model: 'openai/gpt-oss-20b', label: 'GPT-OSS 20B', tier: 'deep' },
  { id: 'groq-qwen3', provider: 'groq', model: 'qwen/qwen3-32b', label: 'Qwen3 32B', tier: 'deep' },

  // OpenRouter (key: OPENROUTER_API_KEY, from openrouter.ai) - paid models first, then ":free" backups
  { id: 'or-gpt4omini', provider: 'openrouter', model: 'openai/gpt-4o-mini', label: 'GPT-4o mini', tier: 'fast', paid: true },
  { id: 'or-gemini-flash', provider: 'openrouter', model: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash', tier: 'fast', paid: true },
  { id: 'or-haiku', provider: 'openrouter', model: 'anthropic/claude-haiku-4.5', label: 'Claude Haiku 4.5', tier: 'fast', paid: true },
  { id: 'or-sonnet', provider: 'openrouter', model: 'anthropic/claude-sonnet-4.5', label: 'Claude Sonnet 4.5', tier: 'deep', paid: true },
  { id: 'or-gpt41', provider: 'openrouter', model: 'openai/gpt-4.1', label: 'GPT-4.1', tier: 'deep', paid: true },
  { id: 'or-deepseek-r1', provider: 'openrouter', model: 'deepseek/deepseek-r1', label: 'DeepSeek R1', tier: 'deep', paid: true },
  { id: 'or-llama70', provider: 'openrouter', model: 'meta-llama/llama-3.3-70b-instruct:free', label: 'Llama 3.3 70B', tier: 'fast' },
  { id: 'or-gptoss120', provider: 'openrouter', model: 'openai/gpt-oss-120b:free', label: 'GPT-OSS 120B', tier: 'deep' },
  { id: 'or-qwen-next', provider: 'openrouter', model: 'qwen/qwen3-next-80b-a3b-instruct:free', label: 'Qwen3 Next 80B', tier: 'deep' },
  { id: 'or-glm', provider: 'openrouter', model: 'z-ai/glm-4.5-air:free', label: 'GLM 4.5 Air', tier: 'deep' },
]
