import { ChatService } from "@/services/chat.service";
import { SearchService } from "@/services/search.service";

export interface ISearchChatResult {
  userPrompt: string;
  derivedQueries: string[];
  referencedUrls: string[];
  finalAnswer: string;
}

export class SearchChatService {
  private chatService: ChatService;
  private searchService: SearchService;

  /**
   * Info: (20260812 - Luphia) 沒收到金鑰就不要傳 —— 理由同 SearchService 的建構子。
   *
   * 這裡原本的 env 補位會同時汙染兩個下游(ChatService 與 SearchService),
   * 兩者都因此看不到資料庫設定。
   */
  constructor(apiKey?: string) {
    this.chatService = new ChatService(apiKey);
    this.searchService = new SearchService(apiKey);
  }

  // Info: (20260407 - Luphia) Generates a sub-query array from a broad user prompt.
  private async planSearchQueries(userPrompt: string): Promise<string[]> {
    const prompt = `
      You are an expert research planner. The user has posed a complex question.
      Your job is to break this question down into highly-targeted, raw search-engine keyword strings.
      
      [User Question]: "${userPrompt}"

      Rules:
      1. Provide a MAXIMUM of 3 distinct search queries.
      2. Keep them concise (like Google or DuckDuckGo search strings).
      3. ONLY output a valid flat JSON array of strings. Do not include markdown blocks like \`\`\`json.
      Example: ["query one", "query two"]
    `;

    const responseText = await this.chatService.generateContent(
      [{ text: prompt }],
      {
        isJson: true,
        temperature: 0.1,
      },
    );

    try {
      const parsed = JSON.parse(responseText);
      if (Array.isArray(parsed)) {
        // Info: (20260407 - Luphia) Enforce maximum 3 queries
        return parsed.slice(0, 3);
      }
      return [];
    } catch (e) {
      console.error(
        "[SearchChatService] Planner failed to output valid JSON array.",
        e,
      );
      return [];
    }
  }

  /**
   * Info: (20260407 - Luphia)
   * Fully orchestrates the Reasoning AI loop.
   * Prompts -> Plans -> Scrapes -> Synthesizes.
   */
  public async chatWithWeb(userPrompt: string): Promise<ISearchChatResult> {
    console.log(
      `\n[SearchChat Orchestrator] Initiating Deep Reasoning for: "${userPrompt}"`,
    );

    // Info: (20260407 - Luphia) Phase 1. Planning
    console.log(
      "[SearchChat Orchestrator] Analyzing question and deriving optimal search vectors...",
    );
    const queries = await this.planSearchQueries(userPrompt);

    if (queries.length === 0) {
      console.log(
        "[SearchChat Orchestrator] Fallback: Directly searching user prompt as singular query.",
      );
      queries.push(userPrompt);
    }

    console.log(
      `[SearchChat Orchestrator] Derived sub-queries to map:`,
      queries,
    );

    /**
     * Info: (20260407 - Luphia) Phase 2. Execution
     * Fire all sub-queries concurrently via SearchService
     * Limiting each query to dig into the top 2 web pages to balance latency and depth.
     */
    console.log(
      "[SearchChat Orchestrator] Spawning parallel Docker scrapers...",
    );

    const subResults = [];
    for (let i = 0; i < queries.length; i++) {
      if (i > 0) {
        console.log(
          "[SearchChat Orchestrator] Throttling for 3 seconds to ensure content delivery and prevent API 503 rate limits...",
        );
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
      try {
        const res = await this.searchService.searchAndSummarize({
          query: queries[i],
          maxPages: 2,
          maxSummaryLength: 300,
        });
        subResults.push(res);
      } catch (err) {
        console.error(
          `[SearchChat Orchestrator] Sub-query "${queries[i]}" bypassed due to error:`,
          err,
        );
      }
    }

    // Info: (20260407 - Luphia) Aggregation
    const allUrls = new Set<string>();
    const contextBlocks: string[] = [];

    subResults.forEach((res, idx) => {
      res.scrapedUrls.forEach((url) => allUrls.add(url));
      contextBlocks.push(
        `[Search Vector ${idx + 1}: "${res.query}"]\n[Raw Extracted Intelligence]: ${res.summary}`,
      );
    });

    const uniqueUrls = Array.from(allUrls);

    // Info: (20260407 - Luphia) Phase 3. Synthesis
    console.log(
      "[SearchChat Orchestrator] Search vectors concluded. Synthesizing final response...",
    );

    const synthesisPrompt = `
      You are an elite, highly intelligent research analyst. 
      Synthesize a comprehensive, direct, and factual answer to the User's Original Question using ONLY the compiled intelligence gathered by your sub-scrapers.

      [User's Original Question]:
      "${userPrompt}"

      [Gathered Sub-Scraper Intelligence]:
      ${contextBlocks.join("\n\n---\n\n")}

      [Rules]:
      - Address the user's question directly. 
      - Do not hallucinate external knowledge outside the provided scope.
      - Structure your response cleanly with markdown if comparing points.
      - Briefly mention or cite domains if the intelligence explicitly references a source.
      - At the very bottom of your response, output a "### References" section listing the URLs from the scraped data.
      
      Available Extracted URLs to list under References:
      ${uniqueUrls.join("\n")}
    `;

    const finalAnswer = await this.chatService.generateContent(
      [{ text: synthesisPrompt }],
      {
        temperature: 0.3, // Info: (20260407 - Luphia) Slight creative liberty to weave facts elegantly
      },
    );

    const finalAnswerTrimmed = finalAnswer.trim();
    console.log("[SearchChat Orchestrator] Mission Accomplished!");

    return {
      userPrompt,
      derivedQueries: queries,
      referencedUrls: uniqueUrls,
      finalAnswer: finalAnswerTrimmed,
    };
  }
}
