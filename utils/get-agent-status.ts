import { ToolInvocation } from '../types';

/**
 * Derives a human-friendly status message from the current agent state.
 * Maps tool names and states to descriptive strings.
 */
export function getAgentStatus(isLoading: boolean, toolInvocations?: ToolInvocation[]) {
  if (!isLoading && (!toolInvocations || toolInvocations.length === 0)) return null;

  // 1. Check if tools are currently executing
  const activeTools = toolInvocations?.filter(ti => ti.state === 'call');
  
  if (activeTools && activeTools.length > 0) {
    if (activeTools.length > 1) return `Executing ${activeTools.length} parallel tasks...`;
    
    // Normalize tool name for matching (remove spaces or underscores)
    const toolName = activeTools[0].toolName.toLowerCase().replace(/[\s_]/g, '');
    
    if (toolName === 'searchweb') return "Searching the live web...";
    if (toolName === 'webcrawler') return "Deep-crawling page content...";
    if (toolName === 'getgithubtrending') return "Analyzing GitHub trends...";
    if (toolName === 'getnews') return "Fetching latest headlines...";
    if (toolName === 'deepsearch') return "Performing multi-staged research...";
    if (toolName === 'imagesearch') return "Scanning for related images...";
    if (toolName === 'hackernewssearch') return "Scanning Hacker News...";
    if (toolName === 'googleaisearch') return "Extracting Google AI Summaries...";
    if (toolName === 'duckduckgosearch') return "Searching DuckDuckGo...";
    if (toolName === 'yandexsearch') return "Querying Yandex Search...";
    if (toolName === 'stockprices') return "Fetching live stock quotes...";
    if (toolName === 'opensearchdiscovery') return "Probing OpenSearch schemas...";
    if (toolName === 'wikipediasummary') return "Querying Wikipedia...";
    if (toolName === 'dnslookup') return "Performing DNS lookup...";
    if (toolName === 'subdomainscanner') return "Scanning subdomains...";
    if (toolName === 'cryptoprices') return "Fetching live crypto prices...";
    
    // Fallback for other tools
    const normalName = activeTools[0].toolName
      .replace(/([A-Z])/g, ' $1') // Add space before capitals
      .replace(/[_-]/g, ' ')       // Replace _ or - with space
      .trim();
    return `Running ${normalName}...`;
  }

  // 2. If no tools are active but it's still loading, the LLM is "thinking"
  if (isLoading) return "Synthesizing answer...";
  
  return null;
}
