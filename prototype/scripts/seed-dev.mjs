import { randomBytes } from "node:crypto";
import { hash } from "bcryptjs";
import pg from "pg";

if(process.env.NODE_ENV==="production"&&process.env.ALLOW_DEV_SEED!=="true") throw new Error("Dev seed is disabled in production");
const connectionString=process.env.DATABASE_URL;const adminEmail=process.env.ADMIN_EMAIL?.trim().toLowerCase();const adminPassword=process.env.ADMIN_PASSWORD;
if(!connectionString||!adminEmail) throw new Error("DATABASE_URL and ADMIN_EMAIL are required");
const client=new pg.Client({connectionString});await client.connect();
const models=[
  {id:"gpt-5.6-sol",name:"GPT-5.6 Sol",provider:"OpenAI",ci:5,co:30,ri:12.5,ro:75},
  {id:"claude-opus-5",name:"Claude Opus 5",provider:"Anthropic",ci:5,co:25,ri:12.5,ro:62.5},
  {id:"gemini-3.6-flash",name:"Gemini 3.6 Flash",provider:"Google",ci:1.5,co:7.5,ri:3.75,ro:18.75},
  {id:"qwen3.7-max",name:"Qwen 3.7 Max",provider:"Alibaba",ci:2.5,co:7.5,ri:6.25,ro:18.75},
  {id:"grok-4.5",name:"Grok 4.5",provider:"xAI",ci:2,co:6,ri:5,ro:15},
];

await client.query("BEGIN");
try{
  const existingAdmin=await client.query("SELECT id FROM administrators WHERE email=$1",[adminEmail]);
  if(!existingAdmin.rowCount&&!adminPassword) throw new Error("ADMIN_PASSWORD is required when the administrator does not exist");
  if(adminPassword){
    const adminHash=await hash(adminPassword,12);
    await client.query(`INSERT INTO administrators(email,password_hash,name,nickname,timezone,active,password_set_at) VALUES($1,$2,'Support Service','Support','Europe/Minsk',true,now())
      ON CONFLICT(email) DO UPDATE SET password_hash=EXCLUDED.password_hash,name=EXCLUDED.name,nickname=EXCLUDED.nickname,timezone=EXCLUDED.timezone,active=true,password_set_at=now(),updated_at=now()`,[adminEmail,adminHash]);
  }else await client.query("UPDATE administrators SET name='Support Service',nickname='Support',timezone='Europe/Minsk',active=true,updated_at=now() WHERE email=$1",[adminEmail]);
  const userHash=await hash(randomBytes(32).toString("base64url"),10);
  for(let index=1;index<=20;index++){
    const n=String(index).padStart(2,"0");const email=`demo.user${n}@genora.test`;const name=`Тестовый пользователь ${n}`;const createdAt=new Date(Date.now()-(20-index)*86400_000);
    const isClient=(index>=4&&index<=8)||index>=15;
    const status=index<=3?"registration":isClient?"client":"active";
    const userResult=await client.query(`INSERT INTO users(email,password_hash,name,nickname,balance_tokens,status,email_verified_at,last_login_at,created_at,updated_at)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$9) ON CONFLICT(email) DO UPDATE SET name=EXCLUDED.name,nickname=EXCLUDED.nickname,balance_tokens=EXCLUDED.balance_tokens,status=EXCLUDED.status,email_verified_at=EXCLUDED.email_verified_at,last_login_at=EXCLUDED.last_login_at RETURNING id`,
      [email,userHash,name,`demo_${n}`,20000,status,index<=3?null:createdAt,index<=3?null:new Date(createdAt.getTime()+3600_000),createdAt]);
    const userId=userResult.rows[0].id;
    await client.query("DELETE FROM sessions WHERE user_id=$1 AND user_agent LIKE 'Genora.art Seed%'",[userId]);
    if(index>3&&index%3!==0) await client.query(`INSERT INTO sessions(token_hash,user_id,expires_at,ip_address,country_code,user_agent,last_seen_at,created_at)
      VALUES($1,$2,now()+interval '14 days',$3,$4,$5,now()-($6*interval '1 hour'),now()-($7*interval '1 day'))`,[randomBytes(32).toString("hex"),userId,`203.0.113.${index}`,index%4===0?"DE":index%4===1?"BY":index%4===2?"PL":"NL",`Genora.art Seed · ${index%2?"Chrome/macOS":"Safari/iPhone"}`,index%12,index%7]);
    const conversationId=`seed-conversation-${n}`;
    await client.query("DELETE FROM usage_entries WHERE id LIKE $1",[`seed-usage-${n}-%`]);
    await client.query("DELETE FROM conversations WHERE id=$1",[conversationId]);
    const usageTransactions=[];
    if(index>3){
      await client.query(`INSERT INTO conversations(id,user_id,title,model_id,provider_id,depth_id,created_at,updated_at) VALUES($1,$2,$3,$4,$5,'balanced',$6,$6)`,[conversationId,userId,`Тестовый диалог ${n}`,models[index%models.length].id,models[index%models.length].provider,createdAt]);
      await client.query(`INSERT INTO messages(id,conversation_id,role,content,model_id,token_count,thinking_ms,created_at) VALUES
        ($1,$3,'user','Тестовый вопрос для проверки истории',$4,120,null,$5),($2,$3,'assistant','Тестовый ответ модели для dev-админки',$4,340,1250,$5)`,[`seed-message-user-${n}`,`seed-message-assistant-${n}`,conversationId,models[index%models.length].id,createdAt]);
      const entries=2+(index%4);
      for(let item=1;item<=entries;item++){
        const model=models[(index+item)%models.length];const input=400+index*31+item*17;const output=900+index*47+item*29;const cost=(input*model.ci+output*model.co)/1_000_000;const revenue=(input*model.ri+output*model.ro)/1_000_000;
        await client.query(`INSERT INTO usage_entries(id,user_id,conversation_id,chat_title,model,model_id,provider,agent,input_tokens,output_tokens,cost_input_per_1m_usd,cost_output_per_1m_usd,client_input_per_1m_usd,client_output_per_1m_usd,cost_usd,revenue_usd,created_at)
          VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,[`seed-usage-${n}-${item}`,userId,conversationId,`Тестовый диалог ${n}`,model.name,model.id,model.provider,item%3===0?"Research":"Без агента",input,output,model.ci,model.co,model.ri,model.ro,cost,revenue,new Date(Date.now()-(index+item)*43200_000)]);
        usageTransactions.push({tokens:input+output,model:model.name,createdAt:new Date(Date.now()-(index+item)*43200_000)});
      }
    }
    await client.query("DELETE FROM balance_transactions WHERE user_id=$1 AND (note='Dev seed balance' OR note LIKE 'Dev seed %')",[userId]);
    await client.query("INSERT INTO balance_transactions(user_id,kind,token_delta,note,created_at) VALUES($1,'adjustment',20000,'Dev seed стартовый баланс',$2)",[userId,createdAt]);
    for(const entry of usageTransactions) await client.query("INSERT INTO balance_transactions(user_id,kind,token_delta,note,created_at) VALUES($1,'usage',$2,$3,$4)",[userId,-entry.tokens,`Dev seed использование ${entry.model}`,entry.createdAt]);
    if(isClient){
      const topUps=3+(index%3);
      for(let payment=1;payment<=topUps;payment++){
        const amount=10+payment*5;const tokens=amount*1000;
        await client.query(`INSERT INTO balance_transactions(user_id,kind,token_delta,amount_usd,note,payment_provider,payment_reference,created_at)
          VALUES($1,'top_up',$2,$3,$4,'stripe',$5,$6)`,[userId,tokens,amount,`Dev seed пополнение ${payment}`,`test_${n}_${payment}`,new Date(Date.now()-(topUps-payment+1)*86400_000)]);
      }
    }
    await client.query("UPDATE users SET balance_tokens=(SELECT greatest(0,coalesce(sum(token_delta),0)) FROM balance_transactions WHERE user_id=$1) WHERE id=$1",[userId]);
  }
  await client.query("COMMIT");console.log("Dev seed applied: 1 administrator, 20 test users");
}catch(error){await client.query("ROLLBACK");throw error;}finally{await client.end();}
