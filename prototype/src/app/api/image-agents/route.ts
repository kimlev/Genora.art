import { listLocalizedImageAgents } from "@/lib/server/image-agents";
import { isLocale, type Locale } from "@/lib/i18n";

export const runtime="nodejs";

export async function GET(request: Request){
  try{
    const requested=new URL(request.url).searchParams.get("locale");
    const locale: Locale=isLocale(requested ?? "") ? requested as Locale : "en";
    const agents=await listLocalizedImageAgents(locale);
    return Response.json({agents:agents.map((agent)=>({id:agent.id,name:agent.name,description:agent.description,icon:agent.icon,mode:agent.mode,inputMin:agent.inputMin,inputMax:agent.inputMax,consentRequired:agent.consentRequired}))},{headers:{"cache-control":"no-store"}});
  }catch(error){
    console.error("image_agents_failed",error instanceof Error?error.message:"unknown");
    return Response.json({agents:[]},{status:503});
  }
}
