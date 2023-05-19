const dbSettings = require('./dbSettings')
const util = require('util')
const query = util.promisify(dbSettings.query).bind(dbSettings)

async function getAllUsers() {
    const data = await query(`SELECT * FROM nottiktok.users WHERE userId = 2`)

    return data
}

async function getAllPosts() {
    const data = await query(`SELECT * FROM nottiktok.post`)

    return data
}

async function createPost(title, bodyText, picture) {
    const result = await query(`INSERT INTO nottiktok.post (title, bodyText, picture) VALUES("${title}", "${bodyText}", "${picture}")`)

    return result
}

module.exports = {
    getAllUsers,
    getAllPosts,
    createPost
}