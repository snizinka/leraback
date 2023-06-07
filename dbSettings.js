const mysql = require('mysql')

const config = mysql.createConnection({
    host: "localhost",
    user: "Oskan",
    password: "snizinka2002"
})

module.exports = config
