const http = require('http')
const app = require('./app')
require('dotenv').config()
require('./config/dbConnection')

const port = process.env.PORT
const server = http.createServer(app)

server.listen(port, ()=> {
    console.log('server is running');
})