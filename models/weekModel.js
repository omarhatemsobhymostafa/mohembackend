const mongoose = require('mongoose')
const weeksSchema = new mongoose.Schema({
    weekNumber:String,
    babySize:String,
    WhappenInBody:String,
    sympotyms:String,
    babyLooks:String,
    option1:String,
    option2:String,
})

const WeeksModel = mongoose.model("Weeks" , weeksSchema)

module.exports = WeeksModel;