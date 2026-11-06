export type AdvisorMode = 'nutrition' | 'fitness';
export function buildAdvisorHistory(messages: { role: 'user' | 'model'; text: string; error?: boolean }[], limit = 10) {
  return messages.filter((m) => !m.error).slice(-limit).map(({ role, text }) => ({ role, text }));
}
export function languageInstruction(lang: 'en' | 'am') {
  return lang === 'am' ? 'Respond in Amharic unless the user asks for English.' : 'Respond in English unless the user asks for Amharic.';
}
