import { google } from "@ai-sdk/google";
import { queryTopKByCosine } from "@/lib/vector";
import { withRetry } from "@/lib/retry-utils";
import { generateText } from "ai";
import { embedBatch } from "@/lib/embeddings";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
    try{
        const {id:docId} = await ctx.params;
        if(!docId) return Response.json({error:"Missing docId"},{status:400});
        const [{vector:queryVector}] = await embedBatch([
            "Key topics, main sections, and important definitions in this document.",
        ]);

        const records= await queryTopKByCosine(docId,queryVector,10);
        const context = records
        .map((r) => `[p.${r.pageStart}] ${r.text}`)
        .join("\n\n")
        .slice(0, 8000);

        const prompt = [
            "You are helping a user about a specific PDF.",
            "Given the following document chunks, propose exactly three short, diverse, helpful questions.",
            "Constraints:",
            "- 3 questions only; 8–80 characters each; not yes/no; must be answerable from context.",
            "- Avoid duplicates and near-duplicates; use document terminology.",
            "Context:",
            context,
            "Return ONLY a JSON array of 3 strings. No other text."
          ].join("\n");
        
        const result= await withRetry(
            async()=>
                generateText({
                    model:google("gemini-1.5-flash"),
                    prompt,
                    temperature: 0.7,
                    maxOutputTokens: 200,
                }),
            {
                maxAttempts:3,
                initialDelayMs:1500,
                maxDelayMs:8000,
                backoffMultiplier:2,
            },
        )
        let suggestions: string[] = [];
        try{
            const raw= (result.text|| "").trim();
            const jsonStart= raw.indexOf("[");
            const jsonEnd=raw.lastIndexOf("]");
            const jsonText=jsonStart>=0 && jsonEnd>=0 ?raw.slice(jsonStart, jsonEnd+1) :raw;
            const parsed= JSON.parse(jsonText);
            if(Array.isArray(parsed)){
                suggestions=parsed
                .filter((s)=>typeof s==="string")
                .map((s)=>s.trim())
                .filter(Boolean);
            }
        }catch{
            suggestions= (result.text ||"")
            .split("\n")
            .map((line:string)=>line.replace(/^[\s*\-\d\.]+/,"").trim())
            .filter(Boolean);
        }
        suggestions = Array.from(new Set(suggestions)).slice(0, 3);

        if(suggestions.length<3){
            const fallback=[
                "What is the main purpose of this document?",
                "What are the key findings?",
                "What are the key recommendations?",
            ]
            for(const q of fallback){
                if(suggestions.length>=3) break;
                if(!suggestions.includes(q)){
                    suggestions.push(q);
                }
            }
        }
        return Response.json({suggestions: suggestions.slice(0,3)}, {status:200});
    }catch(error){
        console.error(error);
        return Response.json({error:"Internal server error"},{status:500});
    }
}