/** Убирает служебные вызовы инструментов, которые модель иногда пишет в ответ как обычный текст. */
export function sanitizeAssistantContent(value: string): string {
  return value
    .replace(/\r\n?/g, "\n")
    .replace(/<\/?(?:tool_call|function_call|invoke|tool_calls)[^>]*>/gi, "")
    .replace(/<\|\/?(?:tool_call|function_call|invoke)[^|>]*\|>/gi, "")
    .replace(/^(?:[^\n]{0,80}?)?[\p{L}\p{N}._-]*search_query\s*\((?:[^()]|\([^()]*\))*\)\s*/iu, "")
    .replace(/^(?:web_search|function_call|tool_call)\s*\((?:[^()]|\([^()]*\))*\)\s*/iu, "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim();
}
