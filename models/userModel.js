const { default: mongoose } = require("mongoose");

const userSchema = new mongoose.Schema({
  clerkId: {
    type: String,
    required: true,
    unique: true
  },

  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user"
  },

  pregnancies: [
    {
      lastPeriod: Date
    }
  ],

  kids: [
    {
      name: String,
      birthDate: Date
    }
  ]
});
const userModel=mongoose.model('Users' , userSchema)
module.exports = userModel