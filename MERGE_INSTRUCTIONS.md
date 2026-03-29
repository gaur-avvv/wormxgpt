# Merge Instructions: New Tools Batch into services/tools.ts

## Summary
This document provides instructions for merging 37 new tools from `_new_tools_batch.ts` into `services/tools.ts`.

## Tools to Add

### BATCH 1: Job Search Tools (10 tools)
1. JobSearch
2. LinkedInJobSearch
3. IndeedJobSearch
4. RemoteJobSearch
5. SalaryLookup
6. CompanyResearch
7. GlassdoorReviews
8. TechJobsSearch
9. FreelanceJobSearch
10. InternshipSearch

### BATCH 2: Advanced Search Tools (8 tools)
11. MultiEngineSearch
12. AcademicSearch
13. PatentSearch
14. VideoSearch
15. CodeSearch
16. NewsDeepSearch
17. ForumSearch
18. LegalSearch (in TOOL_CATEGORIES but implementation in batch 3)

### BATCH 3: AI Media + E-Commerce Tools (19 tools)
19. PollinationsImage
20. PollinationsText
21. YouTubeSearch
22. TextSummarizer
23. SentimentAnalysis
24. LanguageDetector
25. TextStatistics
26. AmazonProductSearch
27. PriceComparison
28. StockQuote
29. CommodityPrices
30. SocialMediaSearch
31. BookSearch
32. ImageReverseSearch
33. PodcastSearch
34. LegalSearch
35. CouponFinder
36. ProductReviews
37. (CryptoPrice - already exists as CryptoPrices)

## Step-by-Step Merge Instructions

### Step 1: Locate Insertion Point
In `services/tools.ts`, find the `ResearchQueryPlanner` tool (around line 4739-4783).
The insertion point is AFTER the closing brace and comma of `ResearchQueryPlanner`, BEFORE the closing brace of `ATTACHED_TOOLS`.

### Step 2: Copy Tools from _tools_to_merge.ts
Open `_tools_to_merge.ts` and copy all tool definitions (lines 5-1052).

### Step 3: Insert Tools
Paste the copied tools into `services/tools.ts` at line 4784, right before the closing `};` of `ATTACHED_TOOLS`.

### Step 4: Verify TOOL_CATEGORIES
The TOOL_CATEGORIES array (lines 33-169) already includes references to these new tools:
- `jobs_career` category (line 138-144): Already lists all 10 job search tools
- `advanced_search` category (line 145-152): Already lists all 8 advanced search tools (including LegalSearch)
- `ai_media` category (line 153-159): Already lists 9 AI/media tools
- `ecommerce_price` category (line 160-167): Already lists 7 e-commerce tools

NO CHANGES NEEDED to TOOL_CATEGORIES - they're already configured!

### Step 5: Test for Syntax Errors
After merging, run:
```bash
npm run build
# or
tsc --noEmit
```

### Step 6: Verify Tool References
Check that all tools referenced in TOOL_CATEGORIES exist in ATTACHED_TOOLS:
- All tools in `jobs_career` tools array should exist
- All tools in `advanced_search` tools array should exist
- All tools in `ai_media` tools array should exist
- All tools in `ecommerce_price` tools array should exist

## Notes
- The TOOL_CATEGORIES already reference these tools, so they were planned to be added
- Some tools like `CryptoPrice` in ecommerce_price category might need to be renamed to match existing `CryptoPrices`
- The tools use `ATTACHED_TOOLS.search_web.execute()` which should be available
- The tools use `getLocalSettings()` which is already defined in the file

## File Locations
- Source: `_new_tools_batch.ts` (original batch file)
- Prepared: `_tools_to_merge.ts` (cleaned up version ready to merge)
- Target: `services/tools.ts` (main tools file)

## Verification Checklist
- [ ] All 37 tools copied into ATTACHED_TOOLS
- [ ] No syntax errors (closing braces, commas)
- [ ] TypeScript compiles without errors
- [ ] All TOOL_CATEGORIES references match tool names
- [ ] Test a few tools to ensure they execute properly
