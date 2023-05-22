const dbSettings = require('./dbSettings')
const util = require('util')
const query = util.promisify(dbSettings.query).bind(dbSettings)

async function getAllUsers() {
    const data = await query(`SELECT * FROM nottiktok.users WHERE userId = 2`)

    return data
}

async function getAllPosts() {
    const data = await query(`SELECT * FROM calvin.post as pst
    JOIN calvin.postimages as img ON img.post_id = pst.post_id`)

    return data
}

async function createPost(title, body, image) {
    const currentTime = new Date().toISOString().slice(0, 19).replace('T', ' ')
    const data = await query(`INSERT INTO calvin.post (post_title, post_article, user_id, time) VALUES("${title}", "${body}", 1, "${currentTime}")`)
    const postImage = await query(`INSERT INTO calvin.postimages (post_id, image_link, time) VALUES(${data.insertId}, "${image}", "${currentTime}")`)

    return data.insertId
}

async function validateNewLogin(username) {
    const data = await query(`SELECT * FROM calvin.user WHERE username = '${username}'`)

    return data.length
}

async function createNewUserAccount(username, password) {
    const validate = await validateNewLogin(username)
    let data = {}
    let isValidated = false

    if (validate < 1) {
        isValidated = true
        data = await query(`INSERT INTO calvin.user (username, password, role) VALUES('${username}', '${password}', 'customer')`)
    }

    return { newId: data, validationStatus: isValidated }
}

async function authorizeUser(username, password) {
    const userData = await query(`SELECT * FROM calvin.user WHERE username = '${username}' AND password = '${password}'`)
    let isValidated = false

    if (userData.length > 0) {
        isValidated = true
    }

    return { user: userData, validationStatus: isValidated }
}


module.exports = {
    getAllUsers,
    getAllPosts,
    createPost,
    createNewUserAccount,
    validateNewLogin,
    authorizeUser
}