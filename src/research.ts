import { createHash } from "node:crypto";
import { RawSignal, clusterSignals } from "./domain/ingestion.js";
import { SourceAdapter, SourceDefinition } from "./domain/source.js";
import { harvest, HarvestReport } from "./domain/harvest.js";
import { synthesizeOpportunity, SynthesisInput } from "./domain/synthesis.js";

const MAX_RESPONSE_BYTES = 2_000_000;
const REQUEST_TIMEOUT_MS = 10_000;

function idFor(source: string, value: string): string {
  return createHash("sha256").update(source + "\n" + value).digest("hex").slice(0, 24);
}

async function getJson(url: string, headers: Record<string,string> = {}): Promise<unknown> {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  const contentLength = response.headers.get("content-length");
  if (contentLength && Number(contentLength) > MAX_RESPONSE_BYTES) throw new Error("Response exceeds safety limit.");
  const body = await response.text();
  if (Buffer.byteLength(body, "utf8") > MAX_RESPONSE_BYTES) throw new Error("Response exceeds safety limit.");
  try { return JSON.parse(body); } catch { throw new Error("Source returned invalid JSON."); }
}

function classifyCommunitySignal(text: string): RawSignal["kind"] {
  if (/\b(cannot|can't|doesn't|broken|slow|pain|problem|frustrat|expensive|difficult|manual|hate|worst|missing)\b/i.test(text)) return "complaint";
  if (/\b(alternative|competitor|replace|replacement|vs\.?|versus)\b/i.test(text)) return "competitor";
  return "community";
}

export class HackerNewsAdapter implements SourceAdapter {
  definition: SourceDefinition = { id:"hacker-news", type:"community", name:"Hacker News", reliability:0.45, supports:["pain","competition","customers"] };
  async collect(query: string): Promise<RawSignal[]> {
    const url = new URL("https://hn.algolia.com/api/v1/search");
    url.searchParams.set("query", query); url.searchParams.set("tags","story"); url.searchParams.set("hitsPerPage","25");
    const data = await getJson(url.toString());
    if (!data || typeof data !== "object" || !Array.isArray((data as {hits?:unknown}).hits)) throw new Error("Unexpected Hacker News response.");
    return ((data as {hits:unknown[]}).hits).map((hit:unknown) => {
      const h = hit as Record<string,unknown>;
      const id = String(h.objectID ?? h.url ?? h.title ?? "");
      return {
        id:idFor(this.definition.id,id), source:this.definition.id,
        kind:classifyCommunitySignal(String(h.story_text ?? h.title ?? "")), title:String(h.title ?? "Hacker News discussion"),
        text:String(h.story_text ?? h.title ?? ""), observedAt:String(h.created_at ?? new Date().toISOString()),
        url:h.url ? String(h.url) : `https://news.ycombinator.com/item?id=${h.objectID}`,
        metadata:{points:Number(h.points ?? 0),comments:Number(h.num_comments ?? 0)}
      };
    }).filter(x=>x.text.trim());
  }
}

export class RedditAdapter implements SourceAdapter {
  definition: SourceDefinition = { id:"reddit", type:"community", name:"Reddit", reliability:0.4, supports:["pain","competition","customers","local-gap"] };
  async collect(query: string): Promise<RawSignal[]> {
    const url = new URL("https://www.reddit.com/search.json");
    url.searchParams.set("q",query); url.searchParams.set("sort","relevance"); url.searchParams.set("t","year"); url.searchParams.set("limit","25");
    const data = await getJson(url.toString(), {"User-Agent":"Forge/0.1 research collector"});
    const children = data && typeof data === "object" && (data as any).data && Array.isArray((data as any).data.children)
      ? (data as any).data.children as unknown[] : null;
    if (!children) throw new Error("Unexpected Reddit response.");
    return children.map((item:unknown) => {
      const p=(item as any).data ?? {};
      const permalink=p.permalink ? `https://www.reddit.com${String(p.permalink)}` : undefined;
      const text=[p.title,p.selftext].filter(Boolean).map(String).join("\n\n");
      return { id:idFor(this.definition.id,String(p.name ?? permalink ?? p.title ?? "")), source:this.definition.id,
        kind:classifyCommunitySignal(text), title:String(p.title ?? "Reddit discussion"), text,
        observedAt:p.created_utc ? new Date(Number(p.created_utc)*1000).toISOString() : new Date().toISOString(), url:permalink,
        metadata:{score:Number(p.score ?? 0),comments:Number(p.num_comments ?? 0),subreddit:String(p.subreddit ?? "")} };
    }).filter(x=>x.text.trim());
  }
}

export function publicResearchAdapters(): SourceAdapter[] { return [new HackerNewsAdapter(),new RedditAdapter()]; }

export interface ResearchResult {
  harvest: HarvestReport;
  clusters: ReturnType<typeof clusterSignals>;
  draft: ReturnType<typeof synthesizeOpportunity>;
}

export async function research(query:string, adapters:SourceAdapter[], geography?:string):Promise<ResearchResult> {
  const cleanQuery = query.trim();
  if (!cleanQuery || cleanQuery.length > 500) throw new Error("Research query must be between 1 and 500 characters.");
  const result=await harvest(cleanQuery,adapters);
  const clusters=clusterSignals(result.signals);
  const input:SynthesisInput={query:cleanQuery,evidence:result.evidence,clusters,geography};
  return {harvest:result,clusters,draft:synthesizeOpportunity(input)};
}
