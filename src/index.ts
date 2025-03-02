import { Telegraf } from 'telegraf';
import * as cron from 'node-cron';
import axios from 'axios';
import * as dotenv from 'dotenv';
import * as http from 'http';
import { IMG_CAPTIONS } from './captions';


// Load environment variables
dotenv.config();

const BOT_TOKEN: string = process.env.BOT_TOKEN?.trim() || '';
const UNSPLASH_CLIENT_ID: string = process.env.UNSPLASH_CLIENT_ID?.trim() || '';
const PORT: string = process.env.PORT || '3000'; // Default to 3000 locally

if (!BOT_TOKEN) {
  console.error('❌ BOT_TOKEN must be set.');
  process.exit(1);
}

// Initialize bot
const bot = new Telegraf(BOT_TOKEN);

// Logger function to avoid repetition
function log(type: 'info' | 'error', message: string, error?: any): void {
  const prefix = type === 'info' ? 'ℹ️' : '❌';
  if (type === 'info') {
    console.log(`${prefix} ${message}`);
  } else {
    console.error(
      `${prefix} ${message}`,
      error instanceof Error ? error.message : error
    );
  }
}

// Simple HTTP server for Render
const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot is running');
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

server.listen(PORT, () => {
  log('info', `HTTP server running on port ${PORT}`);
});

// Function to fetch a random mosque image
async function getJumaImage(): Promise<string> {
  if (UNSPLASH_CLIENT_ID) {
    try {
      const response = await axios.get(
        'https://api.unsplash.com/photos/random',
        {
          params: { query: 'mosque', client_id: UNSPLASH_CLIENT_ID },
        }
      );
      return response.data.urls.regular;
    } catch (error) {
      log('error', 'Unsplash API error', error);
    }
  }
  return `https://images.unsplash.com/photo-1592326871020-04f58c1a52f3?q=80&w=2565&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D`;
}

let captionOrder = 0;
// Function to generate a Juma Mubarak caption with random variants
function generateCaption(senderName?: string): string {

  captionOrder = ++captionOrder < IMG_CAPTIONS.length ? captionOrder : 0;
  let caption = IMG_CAPTIONS[captionOrder];

  if (senderName) {
    caption += `\n\n🖋 *${senderName}*`;
  }

  return caption;
}

// Function to send Juma Mubarak image
async function sendJumaMubarak(chatId: string, senderName?: string): Promise<void> {
  try {
    const imageUrl = await getJumaImage();
    const caption = generateCaption(senderName);

    await bot.telegram.sendPhoto(chatId, imageUrl, {
      caption,
      parse_mode: 'Markdown',
    });

    log('info', 'Juma Mubarak message sent!');
  } catch (error) {
    log('error', 'Error sending message', error);
  }
}

bot.command('yordam', async (ctx) => {
  const helpMessage = `
🤖 *Bot Buyruqlari*:

/tabrik - Juma bilan tabriklash  
/yordam - Bot haqida ma’lumot olish  

ℹ️ Buyruqlardan foydalanish uchun *"/"* belgisini kiriting va kerakli buyruqni tanlang.
    `;

  await ctx.reply(helpMessage, { parse_mode: 'Markdown' });
});

// Handle /tabrik command in any chat
bot.command('tabrik', async (ctx) => {
  const senderName = ctx.from?.first_name
    ? `${ctx.from.first_name}${ctx.from.last_name ? ' ' + ctx.from.last_name : ''}`
    : `Muallif noma'lum`;
  await sendJumaMubarak(ctx.chat.id.toString(), senderName);
});

// Schedule cron job for every Friday at 0:00 AM (UTC)
cron.schedule('0 0 * * 5', async () => {
  log('info', 'Running scheduled Juma Mubarak task at 0:00 AM (UTC)...');
  try {
    await sendJumaMubarak(process.env.GROUP_CHAT_ID || '');
    log('info', 'Scheduled Juma Mubarak message successfully sent.');
  } catch (error) {
    log('error', 'Scheduled task error', error);
  }
});

// Launch bot
(async () => {
  try {
    await bot.launch(() => log('info', 'Bot is running...'));
  } catch (error) {
    log('error', 'Failed to start bot', error);
    process.exit(1);
  }
})();

// Graceful shutdown
process.once('SIGINT', () => {
  log('info', 'Shutting down bot...');
  bot.stop('SIGINT');
  server.close();
});
process.once('SIGTERM', () => {
  log('info', 'Shutting down bot...');
  bot.stop('SIGTERM');
  server.close();
});

// Handle unexpected errors
process.on('uncaughtException', (error) =>
  log('error', 'Uncaught Exception', error)
);
process.on('unhandledRejection', (reason) =>
  log('error', 'Unhandled Promise Rejection', reason)
);