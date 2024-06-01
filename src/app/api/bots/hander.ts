import { Telegraf } from "telegraf";
import { NextResponse } from "next/server";
import config from "@/config/bot.json";

export default function handler(bot: Telegraf) {
  return async function POST(request: Request) {
    let endTimer = setTimeout(() => {
      return NextResponse.json({ message: "Ok" }, { status: 200 });
    }, config.timeout * 1000);

    let update = await request.json();
    await bot.handleUpdate(update);
    clearTimeout(endTimer);
    return NextResponse.json({ message: "Ok" }, { status: 200 });
  };
}
