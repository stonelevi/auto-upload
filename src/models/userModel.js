import mongoose, { Mongoose } from "mongoose";

const dataUserSchema = new mongoose.Schema({
    id: {
        type: String,
        unique: true,
    },
    name: String,
    token: String,
    id_con: [{ type: mongoose.Schema.Types.ObjectId }]
}, {
    collection: 'Account'
});


const userModel = mongoose.model('User', dataUserSchema);

module.exports = userModel