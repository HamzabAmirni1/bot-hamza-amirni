/**
      Created by Jaya ID
      Uses GPT-4
      
      Please do not remove this watermark.
**/

const axios = require("axios");

let handler = async (m, { conn, usedPrefix, command, text }) => {
    if (!text)
        throw `What do you want to ask?\n\nExample: ${
            usedPrefix + command
        } hello bot`; // Replies when no text is detected except for the command

    try {
        await m.react('💬'); // Auto-reaction when the feature is triggered

        let d = new Date(new Date() + 3600000); // Creates the current date
        let locale = 'en'; // Set the locale if needed
        const time = new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }); // Adjusts time to Jakarta timezone
        let day = d.toLocaleDateString(locale, { weekday: 'long' }); // Gets the current day
        let date = d.toLocaleDateString(locale, {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        }); // Formats date as day, month, and year

        let logic = `Your name is Cyno, and you were created and developed by Jaya. Use casual language, such as 'I' and 'you' in responses. You are intelligent in handling any problem. Always use appropriate emojis in every sentence. Use the date ${date}. Use the time ${time}. Use the day ${day}.`; 

        let json = await openai(text, logic); // Calls the function with text and logic
        await conn.sendThumb(
            m.chat, 
            `\`✨ ChatGPT4\`\n\n> ${json}`, 
            'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSUgq45nsxxSRPEUMhX3Bgzctxv7VT-ieYmdw&usqp=CAU', 
            m
        ); // Replies with the response from the function

        await m.react('🔥'); // Auto-reaction on success
    } catch (e) {
        await m.react('❎'); // Auto-reaction on error
    }
};

handler.help = ["openai"];
handler.tags = ["ai"];
handler.command = /^(openai)$/i;

module.exports = handler;

async function openai(text, logic) { // Function to call OpenAI
    let response = await axios.post("https://chateverywhere.app/api/chat/", {
        "model": {
            "id": "gpt-4",
            "name": "GPT-4",
            "maxLength": 32000, // Adjust token limit if needed
            "tokenLimit": 8000, // Adjust token limit for GPT-4
            "completionTokenLimit": 5000, // Adjust if necessary
            "deploymentName": "gpt-4"
        },
        "messages": [
            {
                "pluginId": null,
                "content": text, 
                "role": "user"
            }
        ],
        "prompt": logic, 
        "temperature": 0.5
    }, { 
        headers: {
            "Accept": "/*/",
            "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
        }
    });

    let result = response.data;
    return result;
}
