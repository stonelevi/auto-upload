import express from "express";
import homeController from '../controller/homeController';
import multer from "multer";
import path from "path";

var appRoot = require('app-root-path');
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, appRoot + '/src/public/video');
    },
    // By default, multer removes file extensions so let's add them back
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

const videoFilter = function (req, file, cb) {
    // Accept images only
    if (!file.originalname.match(/\.(mp4|MP$|mov|MOV|mkv|MKV|avi|AVI|flv|FLV)$/)) {
        req.fileValidationError = 'Only image files are allowed!';
        return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
};

let upload = multer({ storage: storage, fileFilter: videoFilter });



let router = express.Router();

const initWebRoute = (app) => {
    router.get('/', homeController.getHomepage);
    router.post('/get-token', homeController.getToken);
    router.get('/share', homeController.getSharePage)
    router.post('/share-post', homeController.getPostShare);
    router.get('/video', homeController.getVideoPage);
    router.post('/post-video', upload.single('file_video'), homeController.postVideo);

    return app.use('/', router)
}

module.exports = initWebRoute;