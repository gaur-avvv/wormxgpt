export function validateAndFixToolArgs(args: string, toolName?: string): string {
  const trimmed = args.trim();
  if (!trimmed) return "{}";

  try {
    // If it's already valid JSON, we're good
    JSON.parse(trimmed);
    return trimmed;
  } catch (e) {
    // It's not valid JSON. Let's try to fix it.

    // 0. Remove markdown code blocks if present
    const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
    const candidate = codeBlockMatch ? codeBlockMatch[1].trim() : trimmed;
    try {
      JSON.parse(candidate);
      return candidate;
    } catch (err) { }

    // 1. Basic brace fixing
    if (candidate.startsWith('{')) {
      for (const suffix of ['}', '"}', 'null}', '0}', '"]}']) {
        try {
          const fixed = candidate + suffix;
          JSON.parse(fixed);
          return fixed;
        } catch (err) { }
      }
    }

    // 2. Tool-specific smart mapping (Sync with PascalCase names)
    if (toolName) {
      // Clean leading fluff
      const cleaned = candidate.replace(/^(arguments|args|params|location|query|url|content|topic|q|language|since|id|repo|path):\s*/i, '');
      const t = toolName.toLowerCase();

      const queryTools = ['getnews', 'searchweb', 'searchsearxng', 'wikipediasummary', 'deepresearch', 'sgaismartscraper', 'hackernewssearch', 'imagesearch', 'googleaisearch', 'duckduckgosearch', 'yandexsearch', 'exasearch', 'bravesearch', 'arxivsearch', 'redditsearch', 'githubapifinder', 'githubtrending', 'multiregionalsearch'];
      if (queryTools.some(name => name === t)) { return JSON.stringify({ query: cleaned || candidate }); }

      if (t === 'githubapifinder') {
        const repoMatch = candidate.match(/"?repo"?\s*:\s*"([^"]+)"/);
        return JSON.stringify({ query: cleaned || candidate, repo: repoMatch ? repoMatch[1] : undefined });
      }
      if (t === 'getweather') { return JSON.stringify({ location: cleaned || candidate }); }
      if (['webcrawler', 'archivesearch', 'opensearchdiscovery', 'sgaiaagenticscraper'].includes(t)) { return JSON.stringify({ url: cleaned || candidate }); }
      if (t === 'githubtrending') { return JSON.stringify({ language: cleaned || candidate }); }
      if (t === 'whoislookup') { return JSON.stringify({ target: cleaned || candidate }); }
      if (['ipgeolocation', 'reversedns'].includes(t)) { return JSON.stringify({ ip: cleaned || candidate }); }
      if (['securityauditor', 'markdownify', 'sgaimarkdownify'].includes(t)) { return JSON.stringify({ content: candidate }); }
      if (['dnslookup', 'subdomainscanner'].includes(t)) { return JSON.stringify({ domain: cleaned || candidate }); }
      if (t === 'cryptoprices') { return JSON.stringify({ ids: cleaned || candidate }); }
      if (t === 'stockprices') { return JSON.stringify({ symbol: cleaned || candidate }); }
      if (t === 'readmemory') { return JSON.stringify({ id: cleaned || candidate }); }
      if (t === 'githubrepostructure') { return JSON.stringify({ repo: cleaned || candidate }); }

      // Special Multi-Argument extractors
      if (t === 'storememory') {
        const idMatch = candidate.match(/"?id"?\s*:\s*"([^"]+)"/);
        const contentMatch = candidate.match(/"?content"?\s*:\s*"([\s\S]+)"/);
        if (idMatch && contentMatch) return JSON.stringify({ id: idMatch[1], content: contentMatch[1].trim() });
        // Fallback guess: first run of no spaces is ID, rest is content
        const firstSpace = candidate.indexOf(' ');
        if (firstSpace > 0) return JSON.stringify({ id: candidate.substring(0, firstSpace).replace(/['"]/g, ''), content: candidate.substring(firstSpace + 1).trim() });
      }

      if (t === 'githubfilecontent') {
        const repoMatch = candidate.match(/"?repo"?\s*:\s*"([^"]+)"/);
        const pathMatch = candidate.match(/"?path"?\s*:\s*"([^"]+)"/);
        if (repoMatch && pathMatch) return JSON.stringify({ repo: repoMatch[1], path: pathMatch[1] });
      }

      if (t === 'fakeidentitygenerator') {
        if (cleaned.includes('scrape')) return JSON.stringify({ action: 'scrape' });
        const match = cleaned.match(/\d+/);
        return JSON.stringify({ action: 'generate', count: parseInt(match ? match[0] : '1') });
      }
    }

    // 3. Final extraction attempt
    const startIdx = candidate.indexOf('{');
    const endIdx = candidate.lastIndexOf('}');
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      try {
        const extracted = candidate.substring(startIdx, endIdx + 1);
        JSON.parse(extracted);
        return extracted;
      } catch (err) { }
    }

    // 4. Default wrapper - use a key that is likely to be accepted or at least valid JSON
    // Mapping to 'query' or 'input'
    return JSON.stringify({ query: candidate });
  }
}

export function getToolExecutingString(toolName: string): string {
  return `[⚡] **Executing:** \`${toolName}\`...`;
}

export function getToolResultString(toolName: string, isError: boolean): string {
  if (isError) {
    return `[❌] **Error:** \`${toolName}\``;
  }
  return `[✔] **Data Retrieved:** \`${toolName}\``;
}
