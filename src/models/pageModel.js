import mongoose, { Mongoose } from "mongoose";

const dataPageSchema = new mongoose.Schema({
    id: {
        type: String,
        unique: true,
    },
    name: String,
    id_via: String,
    name_via: String,
    access_token: String,
    fan_count: String,
    valueDay: String,
    valueWeek: String,
    valueDays28: String,
    is_published: Boolean,
}, {
    collection: 'Datapage1'
})

const pageModel = mongoose.model('Datapage1', dataPageSchema);

module.exports = pageModel

