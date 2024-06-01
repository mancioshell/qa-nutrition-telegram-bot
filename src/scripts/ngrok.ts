import ngrok from "ngrok";
// @ts-ignore
import { parse, stringify } from "envfile";
import fs from "fs";

async function startNgrok() {
  let data = await fs.readFileSync(".env", "utf-8");
  let envs = parse(data);
  await ngrok.authtoken(process.env.NGROK_AUTH_TOKEN!);
  const url = await ngrok.connect(3000);
  console.log(`Server is publicly accessible at ${url}`);
  let enhancedEnvs = stringify({ ...envs, WEBHOOK_URL: `${url}/api/bots` });
  await fs.writeFileSync(".env", enhancedEnvs);
}

startNgrok();
