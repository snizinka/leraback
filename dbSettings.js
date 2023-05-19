const mysql = require('mysql')

const config = mysql.createConnection({
    host: "localhost",
    user: "Oskan",
    password: "snizinka2002Q1"
})

module.exports = config
