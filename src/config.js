require('dotenv').config();

module.exports = {
  port: process.env.PORT || 4000,
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    assistantId: process.env.ASSISTANT_ID,
  },
  greenapi: {
    idInstance: process.env.GREEN_API_ID_INSTANCE,
    apiTokenInstance: process.env.GREEN_API_TOKEN_INSTANCE,
  },
  boostapp: {
    // Zapier disabled for now
    zapierWebhookUrl: null, 
    apiKey: process.env.BOOSTAPP_API_KEY || 'eyJzIjoxLCJzdSI6IjY3OGY4ZjA2OGQ4YTgifQ==',
    baseUrl: process.env.BOOSTAPP_BASE_URL || 'https://api.boostapp.com', 
  },
  humanAgent: {
    // Updated to the correct number: 052-577-2886 -> 972525772886
    phone: '972525772886', 
  },
  social: {
    instagram: 'https://www.instagram.com/minimalbody_il/', 
    googleReviews: 'https://www.google.com/maps/place/Minimal+Body+-+מינימל+בודי%E2%80%AD/@31.6804886,34.5561819,17z/data=!4m8!3m7!1s0x15029d8e7d7b8579:0x497b4a85defea479!8m2!3d31.6804886!4d34.5561819!9m1!1b1!16s%2Fg%2F11xdhq_rdc?entry=ttu',
    website: 'https://minimalbody.co.il',
    videos: {
        male: 'https://www.instagram.com/reel/DNLRupaMg3G/',
        female: 'https://www.instagram.com/reel/DNxQiYwWIom/'
    }
  }
};
