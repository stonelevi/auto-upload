const userModel = require('../models/userModel');
const pageModel = require('../models/pageModel');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
import axios from 'axios';
import { response } from 'express';


let getHomepage = async (req, res) => {
    try {
        const data = await userModel.find({}); // Sử dụng async/await để lấy dữ liệu
        res.render('index', { danhsach: data }); // Truyền dữ liệu vào template
    } catch (err) {
        console.log('Lỗi lấy dữ liệu', err);
        res.status(500).send('Lỗi lấy dữ liệu'); // Xử lý lỗi và trả về lỗi cho client
    }
}

let getToken = async (req, res) => {
    let dataToken = req.body.token;
    try {
        const response = await axios.get(`https://graph.facebook.com/me?fields=name,id&access_token=${dataToken}`);
        await userModel.findOneAndUpdate(
            { id: response.data.id },
            {
                $set: {
                    id: response.data.id,
                    name: response.data.name,
                    access_token: dataToken
                }
            },
            { upsert: true }
        );

        const infoPage = await axios.get(`https://graph.facebook.com/me/accounts?access_token=${dataToken}`);
        const pageData = infoPage.data.data;

        await Promise.all(pageData.map(async (page) => {
            await pageModel.findOneAndUpdate(
                { id: page.id },
                {
                    $set: {
                        id: page.id,
                        name: page.name,
                        access_token: page.access_token,
                    }
                },
                { upsert: true }
            );
        }));

        for (const page of pageData) {
            if (page.id && page.access_token) { // Kiểm tra giá trị page.id và page.access_token tồn tại
                const response = await axios.get(`https://graph.facebook.com/${page.id}?fields=fan_count&access_token=${page.access_token}`);
                const { fan_count } = response.data;

                await pageModel.findOneAndUpdate(
                    { id: page.id },
                    { $set: { fan_count: fan_count } },
                    { upsert: true }
                );
                const checkPublished = await axios.get(`https://graph.facebook.com/v17.0/${page.id}?fields=is_published&access_token=${page.access_token}`);
                const { is_published } = checkPublished.data;

                await pageModel.findOneAndUpdate(
                    { id: page.id },
                    { $set: { is_published: is_published } },
                    { upsert: true }
                );
                const engage = await axios.get(`https://graph.facebook.com/${page.id}/insights/page_engaged_users?access_token=${page.access_token}`);
                const data = engage.data.data;

                const valueDay = data.find(item => item.period === 'day').values[0].value;
                const valueWeek = data.find(item => item.period === 'week').values[0].value;
                const valueDays28 = data.find(item => item.period === 'days_28').values[0].value;

                await pageModel.findOneAndUpdate(
                    { id: page.id },
                    {
                        $set: {
                            name_via: response.data.name,
                            valueDay: valueDay,
                            valueWeek: valueWeek,
                            valueDays28: valueDays28
                        }
                    },
                    { upsert: true }
                );
                console.log('dữ liệu tương tác', valueDay, 'và', valueWeek, 'và', valueDays28)
                // try {
                //     await userModel.findOneAndUpdate(
                //         { id: response.data.id },
                //         { $push: { id_con: pageModel._id } },
                //     );
                //     console.log('Thêm id con thành công');
                // } catch (err) {
                //     console.error('Lỗi thêm id con:', err);
                // }
            }
        }

        console.log('Chèn vào pageModel thành công');
        res.redirect('/');
    } catch (err) {
        console.error('Lỗi thêm dữ liệu bảng pageModel:', err);
        console.log('Lỗi get-token-page', err);
    }
};

let getSharePage = async (req, res) => {
    try {
        const datapage = await pageModel.find({}); // Sử dụng async/await để lấy dữ liệu
        res.render('share', { danhsachpage: datapage }); // Truyền dữ liệu vào template
    } catch (err) {
        console.log('Lỗi lấy dữ liệu page', err);
        res.status(500).send('Lỗi lấy dữ liệu page'); // Xử lý lỗi và trả về lỗi cho client
    }
}

let getPostShare = async (req, res) => {
    const dataTitle = req.body.title;
    const dataLink = req.body.linkshare;
    const dataCheckbox = req.body.checkboxes;
    console.log('Tiêu đề:', dataTitle);
    console.log('Link:', dataLink);


    for (const datacheckbox of dataCheckbox) {
        pageModel.findOne({ id: datacheckbox })
            .then(dulieuPage => {
                axios.post(`https://graph.facebook.com/me/feed?message=${dataTitle}&link=${dataLink}&access_token=${dulieuPage.access_token}`)
                    .then(response => {
                        console.log('Bài viết đã được đăng lên trang Facebook');
                    })
                    .catch(error => {
                        console.error('Đăng bài viết lên trang Facebook thất bại', error);
                    });
            })
            .catch(error => {
                console.error(error);
            });
    }



    res.redirect('/share');
}

let getVideoPage = async (req, res) => {
    try {
        const datapage = await pageModel.find({}); // Sử dụng async/await để lấy dữ liệu
        res.render('postvideo', { danhsachpage: datapage }); // Truyền dữ liệu vào template
    } catch (err) {
        console.log('Lỗi lấy dữ liệu page', err);
        res.status(500).send('Lỗi lấy dữ liệu page'); // Xử lý lỗi và trả về lỗi cho client
    }
}

const upload = multer().single('file_video')
let postVideo = async (req, res) => {
    const videoPath = req.file.path;
    const titleVideo = req.body.title;
    const videoStats = fs.statSync(videoPath);
    const fileSize = videoStats.size;
    const dataCheckbox = req.body.checkboxes;
    const chunkSize = 10 * 1024 * 1024; // Kích thước mỗi phần của video (10MB) 
    console.log('fileSize=', fileSize, 'dataCheckbox=', dataCheckbox, 'chunkSize=', chunkSize);

    try {
        for (const datacheckbox of dataCheckbox) {
            const dulieuPage = await pageModel.findOne({ id: datacheckbox });

            // Kiểm tra xem có dữ liệu trang (dulieuPage) hay không trước khi tiếp tục
            if (!dulieuPage) {
                console.error('Page not found');
                continue; // Chuyển sang vòng lặp tiếp theo nếu không tìm thấy trang
            }

            // Tạo một session upload mới
            const startResponse = await axios.post(
                `https://graph-video.facebook.com/v12.0/me/videos`,
                {
                    access_token: dulieuPage.access_token,
                    upload_phase: 'start',
                    file_size: fileSize,
                }
            );

            const { upload_session_id, video_id } = startResponse.data;
            console.log('upload_session_id = ', upload_session_id, 'và video_id = ', video_id)

            // Tải lên từng phần của video
            const uploadUrl = `https://graph-video.facebook.com/v12.0/${video_id}`;
            const fileStream = fs.createReadStream(videoPath, { highWaterMark: chunkSize });

            let startOffset = 0;
            let endOffset = chunkSize - 1;
            let chunkIndex = 0;

            fileStream.on('data', async (chunk) => {
                // Upload một phần của video
                const formData = new FormData();
                formData.append('access_token', dulieuPage.access_token);
                formData.append('upload_phase', 'transfer');
                formData.append('start_offset', startOffset);
                formData.append('video_file_chunk', chunk);

                try {
                    const transferResponse = await axios.post(uploadUrl, formData, {
                        headers: {
                            'Content-Type': 'multipart/form-data',
                        },
                    });

                    console.log(`Uploaded chunk ${chunkIndex + 1}`);

                    // Cập nhật offset và tiếp tục tải lên phần tiếp theo
                    startOffset += chunkSize;
                    endOffset += chunkSize;
                    chunkIndex++;

                    if (startOffset >= fileSize) {
                        // Đã tải lên toàn bộ video
                        console.log('Upload complete');
                        completeUpload();
                    }
                } catch (error) {
                    console.error('Error transferring chunk:', error.response.data);
                }
            });

            fileStream.on('error', (error) => {
                console.error('Error reading video file:', error);
            });

            const completeUpload = async () => {
                try {
                    const finishResponse = await axios.post(uploadUrl, {
                        access_token: dulieuPage.access_token,
                        upload_phase: 'finish',
                        upload_session_id: upload_session_id,
                    });

                    console.log('Video upload completed:', finishResponse.data);

                    // Đăng video lên Facebook
                    const publishResponse = await axios.post(
                        `https://graph.facebook.com/v12.0/${video_id}/videos`,
                        {
                            access_token: dulieuPage.access_token,
                            title: titleVideo,
                        }
                    );

                    console.log('Video published:', publishResponse.data);
                } catch (error) {
                    console.error('Error completing upload:', error.response.data);
                }
            };
        }
    } catch (error) {
        console.error('Error finding page:', error);
    }
};

export default {
    getHomepage, getToken, getSharePage, getPostShare, postVideo, getVideoPage,
}


// const accessToken = 'YOUR_ACCESS_TOKEN'; // Thay thế bằng access token của bạn
// const videoPath = 'path/to/video.mp4'; // Thay thế bằng đường dẫn đến video của bạn
// const chunkSize = 10 * 1024 * 1024; // Kích thước mỗi phần của video (10MB)

// const uploadVideo = async () => {
//     try {
//         // Đọc thông tin video
//         const videoStats = fs.statSync(videoPath);
//         const fileSize = videoStats.size;

//         // Tạo một session upload mới
//         const response = await axios.post(
//             `https://graph-video.facebook.com/v12.0/me/videos`,
//             {
//                 access_token: accessToken,
//                 upload_phase: 'start',
//                 file_size: fileSize,
//             }
//         );

//         const { upload_session_id, video_id } = response.data;

//         // Tải lên từng phần của video
//         const uploadUrl = `https://graph-video.facebook.com/v12.0/${video_id}`;
//         const fileStream = fs.createReadStream(videoPath, { highWaterMark: chunkSize });

//         let startOffset = 0;
//         let endOffset = chunkSize - 1;
//         let chunkIndex = 0;

//         fileStream.on('data', async (chunk) => {
//             // Upload một phần của video
//             const formData = new FormData();
//             formData.append('access_token', accessToken);
//             formData.append('upload_phase', 'transfer');
//             formData.append('start_offset', startOffset);
//             formData.append('video_file_chunk', chunk);

//             const response = await axios.post(uploadUrl, formData, {
//                 headers: {
//                     'Content-Type': 'multipart/form-data',
//                 },
//             });

//             console.log(`Uploaded chunk ${chunkIndex + 1}`);

//             // Cập nhật offset và tiếp tục tải lên phần tiếp theo
//             startOffset += chunkSize;
//             endOffset += chunkSize;
//             chunkIndex++;

//             if (startOffset >= fileSize) {
//                 // Đã tải lên toàn bộ video
//                 console.log('Upload complete');
//                 completeUpload();
//             }
//         });

//         fileStream.on('error', (error) => {
//             console.error('Error reading video file:', error);
//         });
//     } catch (error) {
//         console.error('Error starting upload:', error.response.data);
//     }
// };

// const completeUpload = async () => {
//     try {
//         const response = await axios.post(uploadUrl, {
//             access_token: accessToken,
//             upload_phase: 'finish',
//             upload_session_id: upload_session_id,
//         });

//         console.log('Video upload completed:', response.data);

//         // Đăng video lên Facebook
//         const publishResponse = await axios.post(
//             `https://graph.facebook.com/v12.0/${video_id}/videos`,
//             {
//                 access_token: accessToken,
//             }
//         );

//         console.log('Video published:', publishResponse.data);
//     } catch (error) {
//         console.error('Error completing upload:', error.response.data);
//     }
// };

// uploadVideo();
