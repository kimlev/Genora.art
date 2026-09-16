import { listImageAgents } from "@/lib/server/image-agents";

export const runtime="nodejs";

export async function GET(){
  try{
    const agents=await listImageAgents();
    return Response.json({agents:agents.map((agent)=>({id:agent.id,name:agent.name,description:agent.description,icon:agent.icon,mode:agent.mode,inputMin:agent.inputMin,inputMax:agent.inputMax,consentRequired:agent.consentRequired}))},{headers:{"cache-control":"no-store"}});
  }catch(error){
    console.error("image_agents_failed",error instanceof Error?error.message:"unknown");
    return Response.json({agents:[]},{status:503});
  }
}
