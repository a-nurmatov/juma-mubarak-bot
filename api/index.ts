import { VercelRequest, VercelResponse } from '@vercel/node';
import { Telegraf } from 'telegraf';
import axios from 'axios';

// Load environment variables (Vercel handles this automatically)
const BOT_TOKEN: string = process.env.BOT_TOKEN || '';
const GROUP_CHAT_ID: string = process.env.GROUP_CHAT_ID || '';
const PICSART_API_KEY: string = process.env.PICSART_API_KEY || '';

// Validate credentials
if (!BOT_TOKEN || !GROUP_CHAT_ID) {
    throw new Error('BOT_TOKEN and GROUP_CHAT_ID must be set in environment variables.');
}

// Initialize bot (recreated per request since serverless)
const bot = new Telegraf(BOT_TOKEN);

// Handler function for Vercel API
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
    try {
        let imageUrl: string;

        if (PICSART_API_KEY) {
            // Use Picsart API if available
            const response = await axios.post<{ image_url: string }>(
                'https://api.picsart.com/v1/text2image',
                { text: 'Juma Mubarak', style: 'default' },
                {
                    headers: { Authorization: `Bearer ${PICSART_API_KEY}` },
                }
            );
            imageUrl = response.data.image_url;
        } else {
            // Fallback to Unsplash
            imageUrl = 'https://source.unsplash.com/featured/?islamic,friday';
        }

        // Send image to Telegram group
        await bot.telegram.sendPhoto(GROUP_CHAT_ID, imageUrl, {
            caption: 'Juma Mubarak! May your Friday be blessed.',
        });

        res.status(200).json({ message: 'Juma Mubarak message sent!' });
    } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error);
        res.status(500).json({ error: 'Failed to send message' });
    }
}