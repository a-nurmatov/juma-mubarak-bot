import { Telegraf } from 'telegraf';
import * as cron from 'node-cron';
import axios from 'axios';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const BOT_TOKEN: string = process.env.BOT_TOKEN || '';
const GROUP_CHAT_ID: string = process.env.GROUP_CHAT_ID || '';
const PICSART_API_KEY: string = process.env.PICSART_API_KEY || '';

if (!BOT_TOKEN || !GROUP_CHAT_ID) {
    console.error('BOT_TOKEN and GROUP_CHAT_ID must be set.');
    process.exit(1);
}

// Initialize bot
const bot = new Telegraf(BOT_TOKEN);

// Function to fetch or generate image
async function getJumaImage(): Promise<string> {
    if (PICSART_API_KEY) {
        try {
            const response = await axios.post<{ image_url: string }>(
                'https://api.picsart.com/v1/text2image',
                { text: 'Juma Mubarak', style: 'default' },
                { headers: { Authorization: `Bearer ${PICSART_API_KEY}` } }
            );
            return response.data.image_url;
        } catch (error) {
            console.error('Picsart API error:', error instanceof Error ? error.message : error);
            // Fallback to Unsplash if Picsart fails
        }
    }
    const randomParam = Math.random().toString(36).substring(7);
    return `https://source.unsplash.com/featured/?islamic,friday&${randomParam}`;
}

// Function to send Juma Mubarak image
async function sendJumaMubarak(): Promise<void> {
    try {
        const imageUrl = await getJumaImage();
        await bot.telegram.sendPhoto(GROUP_CHAT_ID, imageUrl, {
            caption: 'Juma Mubarak! May your Friday be blessed.',
        });
        console.log('Juma Mubarak message sent!');
    } catch (error) {
        console.error('Error sending message:', error instanceof Error ? error.message : error);
    }
}

// Handle /juma-mubarak command
bot.command('jumaMubarak', async (ctx) => {
    if (ctx.chat.id.toString() === GROUP_CHAT_ID) {
        await sendJumaMubarak();
    } else {
        await ctx.reply('This command is only available in the designated group.');
    }
});

// Schedule cron job for every Friday at 9:00 AM (UTC)
cron.schedule('0 9 * * 5', () => {
    console.log('Running scheduled Juma Mubarak task...');
    sendJumaMubarak();
});

// Launch bot
bot.launch().then(() => {
    console.log('Bot is running...');
});

// Graceful shutdown
process.once('SIGINT', () => {
    console.log('Shutting down bot...');
    bot.stop('SIGINT');
});
process.once('SIGTERM', () => {
    console.log('Shutting down bot...');
    bot.stop('SIGTERM');
});

// Keep process alive (Render-specific tweak)
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});