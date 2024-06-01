import config from "@/config/bot.json";

export const maxDuration = config.timeout;
export const dynamic = "force-dynamic"; // static by default, unless reading the request

import { Telegraf } from "telegraf";
import { message } from "telegraf/filters";
import telegrafNext from "@/app/api/bots/hander";

import {
  welcomeMessage,
  helpMessage,
  enterWelcomeMessage,
  hearsMessage,
  hearsMessageReply,
  goldenRuleMessage,
  clearMessage,
  errorMessage,
} from "@/prompts/message";
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!);

import search, { clearSession } from "@/lib/search";

console.log("Setting webhook to", process.env.WEBHOOK_URL!);

bot.telegram.setWebhook(process.env.WEBHOOK_URL!);

bot.on("my_chat_member", (ctx) => {
  if (ctx.myChatMember.new_chat_member.status === "member") {
    ctx.reply(`${enterWelcomeMessage} ${ctx.from.first_name}.`);
  }
});

bot.start((ctx) => ctx.reply(welcomeMessage));
bot.help((ctx) => ctx.reply(helpMessage));
bot.hears(hearsMessage, (ctx) => ctx.reply(hearsMessageReply));
bot.command("goldenrule", (ctx) => ctx.reply(goldenRuleMessage));
bot.command("clear", async (ctx) => {
  await clearSession(`${ctx.message.chat.id}`);
  ctx.reply(clearMessage);
});

bot.on(message("text"), async (ctx) => {
  ctx.telegram.sendChatAction(ctx.message.chat.id, "typing");

  let response = await search(ctx.message.text, `${ctx.message.chat.id}`);
  if (!response) {
    await ctx.telegram.sendMessage(ctx.message.chat.id, errorMessage);
  } else {
    await ctx.telegram.sendMessage(ctx.message.chat.id, response);
  }
});

bot.catch(async (err, ctx) => {
  console.log(`Ooops, encountered an error for ${ctx.updateType}`, err);
  if (ctx.message)
    await ctx.telegram.sendMessage(ctx.message.chat.id, errorMessage);
});

const updateHandler = telegrafNext(bot);

export const POST = updateHandler;
