import { Telegraf } from 'telegraf';
import * as cron from 'node-cron';
import axios from 'axios';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const BOT_TOKEN: string = process.env.BOT_TOKEN?.trim() || '';
const GROUP_CHAT_ID: string = process.env.GROUP_CHAT_ID?.trim() || '';
const UNSPLASH_CLIENT_ID: string = process.env.UNSPLASH_CLIENT_ID?.trim() || '';

if (!BOT_TOKEN || !GROUP_CHAT_ID) {
  console.error('❌ BOT_TOKEN and GROUP_CHAT_ID must be set.');
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

// Function to generate a Juma Mubarak caption
function generateCaption(senderName?: string): string {
  let caption = `🌙 *Juma Muborak!* \n
🤲 *Alhamdulillah!* Bizni yana bir juma kuniga yetkazgan Allohga hamd bo‘lsin.  
🕋 *La ilaha illallah!* Uning rahmati cheksiz, marhamati bitmas-tuganmas.  
📖 *"Bas, Meni yod eting, Men ham sizni yod etaman!"* *(Baqara: 152)*  
🕌 *Allohning salomi, rahmati va barakoti Payg‘ambarimiz Muhammad Mustafo ﷺ ga bo‘lsin!* 

🕌 Allohning rahmati, muhabbati va barakasi ustingizga yog‘ilsin.  
📿 Ushbu muborak kun duolar, istaklar va ezgu niyatlar qabul bo‘ladigan fursat bo‘lsin.
`;

  if (senderName) {
    caption += `\n\n🖋 *${senderName}*`;
  }

  return caption;
}

// Function to send Juma Mubarak image
async function sendJumaMubarak(senderName?: string): Promise<void> {
  try {
    const imageUrl = await getJumaImage();
    const caption = generateCaption(senderName);

    await bot.telegram.sendPhoto(GROUP_CHAT_ID, imageUrl, {
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

/jumaTabrik - Juma muborak rasmini yuborish  
/yordam - Bot haqida ma’lumot olish  

ℹ️ Buyruqlardan foydalanish uchun *"/"* belgisini kiriting va kerakli buyruqni tanlang.
    `;

  await ctx.reply(helpMessage, { parse_mode: 'Markdown' });
});

// Handle /jumaMubarak command in group chat
bot.command('tabrik', async (ctx) => {
  const senderName = ctx.from?.first_name
    ? `${ctx.from.first_name}${ctx.from.last_name ? ' ' + ctx.from.last_name : ''}`
    : `Muallif noma'lum`; // Fallback if no name available

  await sendJumaMubarak(senderName);
});

// Schedule cron job for every Friday at 5:00 AM (UTC) - No sender name for automated messages
cron.schedule('0 5 * * 5', async () => {
  log('info', 'Running scheduled Juma Mubarak task at 5:00 AM (UTC)...');
  try {
    await sendJumaMubarak(); // No sender name in automated messages
    log('info', 'Juma Mubarak message successfully sent.');
  } catch (error) {
    log('error', 'Scheduled task error', error);
  }
});

// Launch bot
(async () => {
  try {
    await bot.launch(() => {
      log('info', 'Bot is running...');
    });
  } catch (error) {
    log('error', 'Failed to start bot', error);
    process.exit(1);
  }
})();

// Graceful shutdown
process.once('SIGINT', () => {
  log('info', 'Shutting down bot...');
  bot.stop('SIGINT');
});
process.once('SIGTERM', () => {
  log('info', 'Shutting down bot...');
  bot.stop('SIGTERM');
});

// Handle unexpected errors
process.on('uncaughtException', (error) =>
  log('error', 'Uncaught Exception', error)
);
process.on('unhandledRejection', (reason) =>
  log('error', 'Unhandled Promise Rejection', reason)
);
