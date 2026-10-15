import {
  OBSERVATORY_EMBED_DIMENSION,
  OBSERVATORY_EMBED_MODEL,
  OBSERVATORY_EMBED_URL,
} from "@/constants/company_observatory";
import { IObservatoryEmbedder } from "@/interfaces/company_observatory";
import { ollamaEmbeddingResponseSchema } from "@/validators/company_observatory";
import { ObservatoryInfraUnavailableError } from "@/lib/company_observatory/errors";

/**
 * Info: (20261015 - Luphia) 以本機 Ollama（nomic-embed-text，768 維）產生嵌入向量，
 * 與企業觀測站既有的 `company_reports` 同一個模型，向量空間一致。
 *
 * 連不上 Ollama 視為基礎設施不可用（不計文件失敗次數）；
 * 回應維度不對則是真的錯誤——寫進 LanceDB 會讓整張表的向量欄位型別崩掉。
 */
export function createOllamaEmbedder(
  url: string = OBSERVATORY_EMBED_URL,
): IObservatoryEmbedder {
  return {
    async embed(text: string): Promise<number[]> {
      let response: Response;
      try {
        response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: OBSERVATORY_EMBED_MODEL,
            prompt: text,
          }),
        });
      } catch (error) {
        throw new ObservatoryInfraUnavailableError(
          `embedding service unreachable: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
      const parsed = ollamaEmbeddingResponseSchema.safeParse(
        await response.json(),
      );
      if (!response.ok || !parsed.success || !parsed.data.embedding) {
        const detail = parsed.success ? parsed.data.error : "invalid response";
        throw new ObservatoryInfraUnavailableError(
          `embedding failed (HTTP ${response.status}): ${detail ?? "no embedding"}`,
        );
      }
      if (parsed.data.embedding.length !== OBSERVATORY_EMBED_DIMENSION) {
        throw new Error(
          `embedding dimension ${parsed.data.embedding.length} != ${OBSERVATORY_EMBED_DIMENSION}`,
        );
      }
      return parsed.data.embedding;
    },
  };
}
