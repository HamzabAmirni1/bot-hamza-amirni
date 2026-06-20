const settings = {
  packname: 'حمزة اعمرني',
  author: 'حمزة اعمرني',
  botName: "حمزة اعمرني",
  botOwner: 'حمزة اعمرني',
  timezone: 'Africa/Casablanca',
  prefix: '.',
  ownerNumber: ['212624855939', '76704223654068', '72375181807785', '218859369943283'],
  // Phone number used for WhatsApp pairing code (country code + number, without '+', e.g. 2126xxxxxxx)
  pairingNumber: '212612030829',
  extraNumbers: ['212631342792'], // Add extra numbers here after pairing them: ['212600000000', '212700000000']
  newsletterJid: '120363367937224887@newsletter',
  newsletterName: 'حمزة اعمرني',

  // Social Links
  officialChannel: "https://whatsapp.com/channel/0029ValXRoHCnA7yKopcrn1p",
  instagram: 'https://instagram.com/hamza_amirni_01',
  instagram2: 'https://instagram.com/hamza_amirni_02',
  instagramChannel: 'https://www.instagram.com/channel/AbbqrMVbExH_EZLD/',
  facebook: 'https://www.facebook.com/6kqzuj3y4e',
  facebookPage: 'https://www.facebook.com/profile.php?id=61564527797752',
  youtube: 'https://www.youtube.com/@Hamzaamirni01',
  telegram: 'https://t.me/hamzaamirni',
  waGroups: 'https://chat.whatsapp.com/DDb3fGPuZPB1flLc1BV9gJ',
  portfolio: 'https://hamzaamirni.netlify.app',
  botThumbnail: './media/hamza.jpg',

  AUTO_STATUS_REACT: 'true',
  AUTO_STATUS_REPLY: 'false',
  AUTO_STATUS_MSG: 'Status Viewed by حمزة اعمرني',

  AUTORECORD: 'false',
  AUTOTYPE: 'false',
  AUTORECORDTYPE: 'false',



  giphyApiKey: 'qnl7ssQChTdPjsKta2Ax2LMaGXz303tq',
  commandMode: "public",
  description: "This is a bot for managing group commands and automating tasks.",
  version: "2026.1.1",
  hfToken: '', // HuggingFace Token for Qwen AI

  // Supabase, Facebook & Telegram configs
  supabaseUrl: process.env.SUPABASE_URL || 'https://uadsxbfoqqsclubsorvf.supabase.co',
  supabaseKey: process.env.SUPABASE_KEY || 'sb_secret_kvnaI88hIuqV9_KqwthkqA_rYdE-Wz3',
  telegramToken: process.env.TELEGRAM_TOKEN || '8589218915:AAFoh4mnEsnuQOjZjgDrcSTQus7ClnL2VTA',
  fbPageAccessToken: process.env.PAGE_ACCESS_TOKEN || 'EAARU3lwIKlcBQz4GqbCw2Vc6ZAAPKytsEfhN6nCZBbXHdIRQZCchkjUq9BB5k622kDDRQaZCgBRB4pTCRN30hG25QPTZCYvyoYRsZB7MlBpHyHjb9ZAbbnZCkNAEmMFXZB35zCG2xCUjpNVQhWFP00KmTwNP1MryAeRgZBkRbMOZCSaGv6o0zP5XRWEq15cB6gYk6PbwT2BiQZDZD',
  fbPageId: process.env.FB_PAGE_ID || 'me',
  fbPages: [
      { id: process.env.FB_PAGE_ID || 'me', token: process.env.PAGE_ACCESS_TOKEN || 'EAARU3lwIKlcBQz4GqbCw2Vc6ZAAPKytsEfhN6nCZBbXHdIRQZCchkjUq9BB5k622kDDRQaZCgBRB4pTCRN30hG25QPTZCYvyoYRsZB7MlBpHyHjb9ZAbbnZCkNAEmMFXZB35zCG2xCUjpNVQhWFP00KmTwNP1MryAeRgZBkRbMOZCSaGv6o0zP5XRWEq15cB6gYk6PbwT2BiQZDZD' },
  ],
};

module.exports = settings;
