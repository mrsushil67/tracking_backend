const mongoose = require('mongoose')

const url = process.env.MONGO_URL

console.log(url)

const dbConnect = mongoose.connect(url)
.then(()=>{
    console.log("Database connected");
}).catch((err)=> {
    console.log("Error connecting Database : ",err);
})

module.exports = dbConnect;