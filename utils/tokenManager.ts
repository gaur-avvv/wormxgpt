import { Message } from '../types';

export const estimateTokens = (text: string) => Math.ceil(text.length / 4);

export const pruneToolResult = (result: string, maxChars: number = 32000): string => {
  if (!result || result.length <= maxChars) return result;
  
  try {
    const parsed = JSON.parse(result);
    // If it's a large object/array, we should try to keep logical structure but truncate
    if (typeof parsed === 'object') {
       // Return a truncated version with a notice
       return JSON.stringify({
         ...parsed,
         _truncated: true,
         _notice: `Content exceeded limit of ${maxChars} chars and was truncated. Use more specific tools if needed.`,
         // If it's an array, slice it. If it's an object, we can't easily truncate sub-fields safely, 
         // so we just stringify and slice the string.
       }).substring(0, maxChars) + '... [TRUNCATED]';
    }
  } catch (e) {}

  return result.substring(0, maxChars) + '... [TRUNCATED]';
};

export const pruneHistory = (
  history: Message[],
  systemPrompt: string,
  modelMaxTokens: number = 8000,
  responseBudget: number = 1500
): Message[] => {
  const systemBudget = estimateTokens(systemPrompt);
  const historyBudget = Math.max(modelMaxTokens - systemBudget - responseBudget, 1000);

  let recentHistory: Message[] = [];
  let historyTokens = 0;

  for (let i = history.length - 1; i >= 0; i--) {
    const msg = history[i];
    // Handle both string content and complex tool responses
    const contentStr = typeof msg.content === 'string' 
      ? msg.content 
      : JSON.stringify(msg.content || '');
    
    // Also account for tool invocations/responses if present in your message types
    const extraTokens = msg.toolInvocations ? estimateTokens(JSON.stringify(msg.toolInvocations)) : 0;
    const msgTokens = estimateTokens(contentStr) + extraTokens;
    
    if (historyTokens + msgTokens > historyBudget) {
      if (recentHistory.length === 0) {
        recentHistory.unshift({
          ...msg,
          content: contentStr.substring(0, historyBudget * 4) + '... [TRUNCATED]'
        });
      }
      break;
    }
    
    recentHistory.unshift(msg);
    historyTokens += msgTokens;
  }

  return recentHistory;
};
