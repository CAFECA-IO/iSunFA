import { spawn } from "child_process";
import { processManager } from "@/lib/utils/process_manager";
import { GoogleGenerativeAI } from "@google/generative-ai";

export interface ISearchSummaryParams {
  query: string;
  maxPages: number;
  maxSummaryLength: number;
}

export interface ISearchResult {
  query: string;
  scrapedUrls: string[];
  summary: string;
}

export class SearchService {
  private readonly imageName = "ghcr.io/puppeteer/puppeteer:latest";
  private readonly timeoutMs = 90000; // Info: (20260407 - Luphia) Allow 90 seconds since we might scrape multiple pages
  private genAI: GoogleGenerativeAI;
  private modelName: string;

  constructor(apiKey?: string) {
    const key =
      apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
    this.genAI = new GoogleGenerativeAI(key);
    this.modelName = process.env.MODEL || "gemini-1.5-flash";
  }

  // Info: (20260407 - Luphia) Spawns a dockerized Puppeteer instance to scrape search engine results and article contents.
  private async executePuppeteerScraper(
    query: string,
    maxPages: number,
  ): Promise<{ url: string; content: string }[]> {
    return new Promise((resolve, reject) => {
      let resolved = false;

      /**
       * Info: (20260407 - Luphia) The dynamic script run continuously via Puppeteer inside the container
       * 1. Searches DuckDuckGo (HTML version) securely bypassing Captchas.
       * 2. Grabs the top N result URLs.
       * 3. Spawns pages, extracts up to 15,000 chars of innerText.
       * 4. Returns a serialized JSON list to stdout.
       */
      const scriptCode = `
      const puppeteer = require('puppeteer');
      (async () => {
        try {
          const browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox']
          });
          
          const maxPages = ${maxPages};
          const targetQuery = ${JSON.stringify(query)};
          
          const page = await browser.newPage();
          // Mask user agent mildly
          await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36');
          await page.setViewport({ width: 1920, height: 1080 });
          
          // DuckDuckGo HTML version is extremely fast and scraper-friendly
          const searchUrl = 'https://html.duckduckgo.com/html/?q=' + encodeURIComponent(targetQuery);
          await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
          
          // Extract top valid URLs (ignoring duckduckgo paths if any)
          const searchResults = await page.evaluate((limit) => {
            const anchors = Array.from(document.querySelectorAll('a.result__url'));
            const urls = anchors.map(a => a.href).filter(href => href.startsWith('http'));
            // Remove duplicates
            return [...new Set(urls)].slice(0, limit);
          }, maxPages);
          
          const scrapedData = [];
          
          // Harvest content sequentially safely
          for (let i = 0; i < searchResults.length; i++) {
            const resultUrl = searchResults[i];
            const contentPage = await browser.newPage();
            try {
              await contentPage.goto(resultUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
              // Extract text efficiently without loading total heavy DOM
              const textContent = await contentPage.evaluate(() => document.body.innerText || '');
              scrapedData.push({ 
                url: resultUrl, 
                content: textContent.replace(/\s+/g, ' ').slice(0, 15000).trim()
              });
            } catch (err) {
              // Soft fail on specific websites blocking logic
            } finally {
              await contentPage.close();
            }
          }
          
          // Output safely as payload hook
          console.log(JSON.stringify({ __crawlerPayload: scrapedData }));
          
          await browser.close();
        } catch (err) {
          console.error(err);
          process.exit(1);
        }
      })();
      `;

      const dockerProcess = spawn("docker", [
        "run",
        "--rm",
        "-i",
        this.imageName,
        "node",
        "-",
      ]);

      processManager.register(dockerProcess);

      let output = "";
      let errorOutput = "";

      dockerProcess.stdout.on("data", (data) => {
        output += data.toString();
      });

      dockerProcess.stderr.on("data", (data) => {
        errorOutput += data.toString();
      });

      const timeoutId = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          dockerProcess.kill("SIGTERM");
          reject(
            new Error(
              `Crawler script exceeded total sandbox timeout of ${this.timeoutMs}ms.`,
            ),
          );
        }
      }, this.timeoutMs);

      dockerProcess.on("close", (code) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timeoutId);

        if (code !== 0 && !output.includes("__crawlerPayload")) {
          reject(
            new Error(`Search Crawler Failed (Code ${code}): ${errorOutput}`),
          );
        } else {
          // Info: (20260407 - Luphia)Robust JSON extraction (since stdout might include puppeteer warnings)
          const startIdx = output.indexOf('{"__crawlerPayload":');
          if (startIdx !== -1) {
            const jsonSubstring = output.slice(startIdx);
            try {
              const data = JSON.parse(jsonSubstring);
              resolve(data.__crawlerPayload);
            } catch {
              reject(
                new Error("Crawler JSON payload was corrupted or incomplete."),
              );
            }
          } else {
            resolve([]);
          }
        }
      });

      dockerProcess.on("error", (err) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timeoutId);
        reject(err);
      });

      dockerProcess.stdin.write(scriptCode);
      dockerProcess.stdin.end();
    });
  }

  // Info: (20260407 - Luphia) Orchestrates the Docker-based search engine scrape and condenses findings via Gemini AI.
  public async searchAndSummarize(
    params: ISearchSummaryParams,
  ): Promise<ISearchResult> {
    console.log(
      `[SearchService] Launching Deep Crawler for query: "${params.query}" (Target top ${params.maxPages} sources)...`,
    );

    // Info: (20260407 - Luphia) 1. Fire up ephemeral docker to scrape
    const scrapedContents = await this.executePuppeteerScraper(
      params.query,
      params.maxPages,
    );

    if (scrapedContents.length === 0) {
      console.log(`[SearchService] Scraper yielded nothing.`);
      return {
        query: params.query,
        scrapedUrls: [],
        summary:
          "No relevant content or accessible sources could be successfully connected to summarize your query.",
      };
    }

    // Info: (20260407 - Luphia) 2. Format Context for Gemini
    console.log(
      `[SearchService] Aggregated ${scrapedContents.length} sources. Feeding into Generative AI Model...`,
    );
    const formattedSources = scrapedContents
      .map((source, index) => {
        return `[Source ${index + 1}: ${source.url}]\n${source.content}\n---`;
      })
      .join("\n\n");

    const systemPrompt = `
      You are an elite web research assistant. Your task is to digest the following raw text excerpts taken directly from the web 
      and formulate a highly structured, accurate, and direct summary responding to the user's initial search query.

      [User Query]: "${params.query}"

      [Crawled Source Data]:
      ${formattedSources}
      
      [Constraints]:
      - Consolidate common themes and synthesize facts primarily based on the crawled sources.
      - Never fabricate external knowledge outside these sources specifically related to the query core.
      - Formulate your summary in Markdown and implicitly cite sources where logical (e.g. "According to domain...").
      - YOUR SUMMARY MUST ABSOLUTELY BE UNDER OR AROUND ${params.maxSummaryLength} WORDS.
    `;

    const model = this.genAI.getGenerativeModel({ model: this.modelName });

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: systemPrompt }] }],
      generationConfig: {
        temperature: 0.2, // Info: (20260407 - Luphia) Factually focused
      },
    });

    return {
      query: params.query,
      scrapedUrls: scrapedContents.map((c) => c.url),
      summary: result.response.text().trim(),
    };
  }
}
