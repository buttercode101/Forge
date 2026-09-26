import { createHash } from "node:crypto";
import { RawSignal, clusterSignals } from "./domain/ingestion.js";
import { SourceAdapter, SourceDefinition } from "./domain/source.js";
import { harvest, HarvestReport } from "./domain/harvest.js";
import { synthesizeOpportunity, SynthesisInput } from "./domain/synthesis.js";

function idFor(source: string, value: string): string {
  return createHash("sha256").update(source + "\n" + value).digest("hex").slice(0, 24);
}

async function getJson(url: string, headers: Record<string,string> = {}): Promise<any> {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json();
}

export class HackerNewsAdapter implements SourceAdapter {
  definition: SourceDefinition = { id:"hacker-news", type:"community", name:"Hacker News", reliability:0.45, supports:["pain","competition","customers"] };
  async collect(query: string): Promise<RawSignal[]> {
    const url = new URL("https://hn.algolia.com/api/v1/search");
    url.searchParams.set("query", query); url.searchParams.set("tags","story"); url.searchParams.set("hitsPerPage","25");
    const data = await getJson(url.toString());
    return (data.hits ?? []).map((hit:any) => ({
      id:idFor(this.definition.id,String(hit.objectID ?? hit.url ?? hit.title ?? "")), source:this.definition.id,
      kind:"complaint" as const, title:hit.title ?? "Hacker News discussion", text:hit.story_text ?? hit.title ?? "",
      observedAt:hit.created_at ?? new Date().toISOString(), url:hit.url ?? `https://news.ycombinator.com/item?id=${hit.objectID}`,
      metadata:{points:Number(hit.points ?? 0),comments:Number(hit.num_comments ?? 0)}
    })).filter((x:RawSignal)=>x.text.trim());
  }
}

export class RedditAdapter implements SourceAdapter {
  definition: SourceDefinition = { id:"reddit", type:"community", name:"Reddit", reliability:0.4, supports:["pain","competition","customers","local-gap"] };
  async collect(query: string): Promise<RawSignal[]> {
    const url = new URL("https://www.reddit.com/search.json");
    url.searchParams.set("q",query); url.searchParams.set("sort","relevance"); url.searchParams.set("t","year"); url.searchParams.set("limit","25");
    const data = await getJson(url.toString(), {"User-Agent":"Forge/0.1 research collector"});
    return (data.data?.children ?? []).map((item:any) => {
      const p=item.data ?? {}; const permalink=p.permalink ? `https://www.reddit.com${p.permalink}` : undefined;
      return { id:idFor(this.definition.id,String(p.name ?? permalink ?? p.title ?? "")), source:this.definition.id,
        kind:"complaint" as const, title:p.title ?? "Reddit discussion", text:[p.title,p.selftext].filter(Boolean).join("\n\n"),
        observedAt:p.created_utc ? new Date(p.created_utc*1000).toISOString() : new Date().toISOString(), url:permalink,
        metadata:{score:Number(p.score ?? 0),comments:Number(p.num_comments ?? 0),subreddit:p.subreddit ?? ""} };
    }).filter((x:RawSignal)=>x.text.trim());
  }
}

export function publicResearchAdapters(): SourceAdapter[] { return [new HackerNewsAdapter(),new RedditAdapter()]; }

export interface ResearchResult {
  harvest: HarvestResult;
  clusters: ReturnType<typeof clusterSignals>;
  draft: ReturnType<typeof synthesizeOpportunity>;
}

export async function research(query:string, adapters:SourceAdapter[], geography?:string):Promise<ResearchResult> {
  const result=await harvest(query,adapters);
  const clusters=clusterSignals(result.signals);
  const input:SynthesisInput={query,evidence:result.evidence,clusters,geography};
  return {harvest:result,clusters,draft:synthesizeOpportunity(input)};
}
