const express = require('express');
const configViewEngine = require('./configs/viewEngine');
const initWebRoute = require('./route/web');
const path = require('path');
import connectDB from './configs/connectDB.js';


connectDB();
// dataModel.find({})
//     .then(function (data) {
//         console.log('data', data);
//     })
//     .catch(function (err) {
//         console.log('gặp lỗi', err);
//     })


require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;
//dùng dấu || để backup port khi PORT bị lỗi.

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
//cấu hình hỗ trợ ng dùng gửi data lên server và lấy đc data 1 cách đơn giản

console.log('kiem tra port', port);

configViewEngine(app);
initWebRoute(app);

app.listen(port, () => {
    console.log(`Ung dung listening tren port ${port}`);
})
