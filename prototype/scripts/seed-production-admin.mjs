import { hash } from "bcryptjs";
import pg from "pg";

const connectionString=process.env.DATABASE_URL;
const email=process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password=process.env.ADMIN_PASSWORD;
if(!connectionString||!email||!password)throw new Error("DATABASE_URL, ADMIN_EMAIL and ADMIN_PASSWORD are required");
if(password.length<12)throw new Error("ADMIN_PASSWORD must contain at least 12 characters");
const client=new pg.Client({connectionString});await client.connect();
try{
  const passwordHash=await hash(password,12);
  await client.query(`INSERT INTO administrators(email,password_hash,name,nickname,timezone,active,password_set_at)
    VALUES($1,$2,'Support Service','Support','Europe/Minsk',true,now())
    ON CONFLICT(email) DO UPDATE SET password_hash=EXCLUDED.password_hash,name=EXCLUDED.name,nickname=EXCLUDED.nickname,
    timezone=EXCLUDED.timezone,active=true,password_set_at=now(),updated_at=now()`,[email,passwordHash]);
  console.log("Production administrator configured");
}finally{await client.end()}
