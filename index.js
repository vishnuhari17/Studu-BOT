require('dotenv').config();
const express = require('express');
const bot = require('./bot');
const app = express();
bot.start();
app.get('/',(req,res)=>{
    res.send('Bot is running')
})
app.listen(process.env.PORT,()=>{
    console.log('Server is running on port', process.env.PORT)
})