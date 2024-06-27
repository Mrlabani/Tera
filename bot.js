require('dotenv').config();
const { Telegraf } = require('telegraf');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const http = require('http');

const bot = new Telegraf(process.env.BOT_TOKEN);

async function downloadVideo(url, replyMessage, userMention, userId) {
  try {
    const response = await axios.get(`https://teraboxvideodownloader.nepcoderdevs.workers.dev/?url=${url}`);
    const data = response.data;

    const resolutions = data.response[0].resolutions;
    const fastDownloadLink = resolutions["Fast Download"];
    const thumbnailUrl = data.response[0].thumbnail;
    const videoTitle = data.response[0].title;

    const videoResponse = await axios.get(fastDownloadLink, { responseType: 'stream' });
    const filePath = path.join(__dirname, `${videoTitle}.mp4`);
    const writer = fs.createWriteStream(filePath);
    videoResponse.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', async () => {
        const thumbnailResponse = await axios.get(thumbnailUrl, { responseType: 'stream' });
        const thumbnailPath = path.join(__dirname, 'thumbnail.jpg');
        const thumbnailWriter = fs.createWriteStream(thumbnailPath);
        thumbnailResponse.data.pipe(thumbnailWriter);
        thumbnailWriter.on('finish', () => resolve({ filePath, thumbnailPath, videoTitle }));
        thumbnailWriter.on('error', reject);
      });
      writer.on('error', reject);
    });
  } catch (err) {
    console.error('Download failed:', err.message);
    throw new Error('Download failed');
  }
}

async function uploadVideo(ctx, filePath, thumbnailPath, videoTitle, replyMessage, collectionChannelId, userMention, userId) {
  const fileStream = fs.createReadStream(filePath);

  try {
    const collectionMessage = await ctx.telegram.sendVideo(
      collectionChannelId,
      { source: fileStream },
      {
        caption: `✨ ${videoTitle}\n👤 Leached by: <a href='tg://user?id=${userId}'>${userMention}</a>\n📥 User link: tg://user?id=${userId}\n\nn<b>By :- FLIX OP</b>`,
        thumb: { source: thumbnailPath },
        fileName: path.basename(filePath),
        supports_streaming: true,
        parse_mode: 'HTML'
      }
    );

    const userMessage = await ctx.telegram.copyMessage(
      ctx.chat.id,
      collectionChannelId,
      collectionMessage.message_id
    );

    await ctx.replyWithSticker("CAACAgIAAxkBAAEZdwRmJhCNfFRnXwR_lVKU1L9F3qzbtAAC4gUAAj-VzApzZV-v3phk4DQE");

    fs.unlinkSync(filePath);
    fs.unlinkSync(thumbnailPath);

    return userMessage.message_id;
  } catch (error) {
    console.error('Upload failed:', error.message);
    throw new Error('Upload failed');
  }
}

bot.start((ctx) => {
  const userId = ctx.from.id;
  const firstName = ctx.from.first_name;
    
    ctx.reply(`
ᴡᴇʟᴄᴏᴍᴇ, <a href='tg://user?id=${userId}'>${firstName}</a>.\n\n🌟 ɪ ᴀᴍ ᴀ ᴛᴇʀᴀʙᴏx ᴅᴏᴡɴʟᴏᴀᴅᴇʀ ʙᴏᴛ.\nsᴇɴᴅ ᴍᴇ ᴀɴʏ ᴛᴇʀᴀʙᴏx ʟɪɴᴋ ɪ ᴡɪʟʟ ᴅᴏᴡɴʟᴏᴀᴅ ᴡɪᴛʜɪɴ ғᴇᴡ sᴇᴄᴏɴᴅs\nᴀɴᴅ sᴇɴᴅ ɪᴛ ᴛᴏ ʏᴏᴜ ✨.
`, { parse_mode: 'HTML', reply_markup: {  inline_keyboard: [[       
{ text: "ᴊᴏɪɴ ❤️🚀", url: "https://t.me/FLIXCHECKER" },
{ text: "ᴅᴇᴠᴇʟᴏᴘᴇʀ ⚡️", url: "tg://user?id=1008848605" }
    ]]} 
});
});

bot.on('text', async (ctx) => {
  const url = ctx.message.text.trim();
  const urlPattern = /https?:\/\/.*tera/i;


  if (!urlPattern.test(url)) {
    return ctx.reply('ᴘʟᴇᴀsᴇ sᴇɴᴅ ᴀ ᴠᴀʟɪᴅ ᴛᴇʀᴀʙᴏx ʟɪɴᴋ.');
  }

  const replyMessage = await ctx.reply('sᴇɴᴅɪɴɢ ʏᴏᴜ ᴛʜᴇ ᴍᴇᴅɪᴀ...🤤');
  const userMention = ctx.from.first_name;
  const userId = ctx.from.id;

  try {
    const { filePath, thumbnailPath, videoTitle } = await downloadVideo(url, replyMessage, userMention, userId);
    await uploadVideo(ctx, filePath, thumbnailPath, videoTitle, replyMessage, process.env.COLLECTION_CHANNEL_ID, userMention, userId);
    await ctx.deleteMessage(ctx.message.message_id);
    await ctx.deleteMessage(replyMessage.message_id); // Delete the "Processing your request..." message
  } catch (err) {
    await ctx.telegram.editMessageText(replyMessage.chat.id, replyMessage.message_id, null, `Error: ${err.message}`);
  }
});

bot.launch().then(() => {
  console.log('Bot is running...');
});

// HTTP server to keep the bot alive
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Bot Alive');
});

const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
  console.log(`Bot started on port ${PORT}`);
});
