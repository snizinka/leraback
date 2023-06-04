const { text } = require('express')
const dbSettings = require('./dbSettings')
const util = require('util')
const query = util.promisify(dbSettings.query).bind(dbSettings)
const nodemailer = require('nodemailer')

var transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: 'snizinkavolshebna@gmail.com',
        pass: 'rqjtxdakovodcoik'
    }
})

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

        const confirmationNumber = Math.floor(100000 + Math.random() * 900000)

        const mailOptions = {
            from: 'ВЖиті <snizinkavolshebna@gmail.com>',
            to: username,
            subject: 'Here is your confirmation code',
            text: confirmationNumber.toString(),
        }
    
        const d = await new Promise((resolve, reject) => {
            transporter.sendMail(mailOptions, function (err, info) {
                if (err) {
                    reject({ error: 'Mail not found' });
                } else {
                    resolve({ confirmationNumber: confirmationNumber });
                }
            })
        })

        data = await query(`INSERT INTO calvin.user (username, password, role, isconfirmed) VALUES('${username}', '${password}', 'customer', 'false')`)
        await query(`INSERT INTO calvin.confirmations (user_id, confirmation_code, confirmation_type) VALUES(${data.insertId}, '${confirmationNumber}', 'register')`)
    }

    return { newId: data, validationStatus: isValidated }
}

async function checkConfirmationCode(code) {
    
}

async function authorizeUser(username, password) {
    const userData = await query(`SELECT * FROM calvin.user WHERE username = '${username}' AND password = '${password}'`)
    let isValidated = false

    if (userData.length > 0) {
        isValidated = true
    }

    return { user: userData, validationStatus: isValidated }
}

async function createPost(title, bodyText, picture, userId, postImages) {
    const searchString = 'socialimages/';
    const postContentIndex = picture.indexOf(searchString);
    let trimmedString = ''
    if (postContentIndex !== -1) {
        trimmedString = picture.substring(postContentIndex + searchString.length);
    }

    const currentTime = new Date().toISOString().slice(0, 19).replace('T', ' ')
    const createdPost = await query(`INSERT INTO calvin.post (post_title, post_article, user_id, preview_img, time) VALUES('${title}', '${bodyText}', ${userId}, '${trimmedString}', '${currentTime}')`)

    for (let i = 0; i < postImages.length; i++) {
        const searchPostString = 'socialimages/';
        const postContentPicIndex = postImages[i].indexOf(searchPostString);
        let trimmedPostString = ''
        if (postContentPicIndex !== -1) {
            trimmedPostString = postImages[i].substring(postContentPicIndex + searchPostString.length);
        }

        const createPostImage = await query(`INSERT INTO calvin.postimages (post_id, image_link, time) VALUES(${createdPost.insertId}, '${trimmedPostString}', '${currentTime}')`)
    }

    let loadNewPost = await query(`SELECT * FROM calvin.post WHERE post_id = ${createdPost.insertId}`)
    let comments = await query(`SELECT * FROM calvin.comments WHERE post_id = ${loadNewPost[0].post_id}`)
    let likes = await query(`SELECT * FROM calvin.postlikes WHERE post_id = ${loadNewPost[0].post_id}`)
    let didUserLiked = await query(`SELECT * FROM calvin.postlikes WHERE post_id = ${loadNewPost[0].post_id} AND user_id = ${userId}`)
    let loadPostImages = await query(`SELECT * FROM calvin.postimages WHERE post_id = ${createdPost.insertId}`)
    loadNewPost[0].comment = comments
    loadNewPost[0].likes = likes.length
    loadNewPost[0].didUserLiked = didUserLiked.length > 0 ? true : false
    loadNewPost[0].postImages = loadPostImages

    return { status: createdPost.insertId !== undefined ? 'Success' : 'Failure', newPost: loadNewPost[0] }
}

async function getAllPosts(userId) {
    let posts = await query(`SELECT * FROM calvin.post`) // 5 posts

    for (let i = 0; i < posts.length; i++) {
        let comments = await query(`SELECT * FROM calvin.comments WHERE post_id = ${posts[i].post_id}`)
        let likes = await query(`SELECT * FROM calvin.postlikes WHERE post_id = ${posts[i].post_id}`)
        let didUserLiked = await query(`SELECT * FROM calvin.postlikes WHERE post_id = ${posts[i].post_id} AND user_id = ${userId}`)
        let loadPostImages = await query(`SELECT * FROM calvin.postimages WHERE post_id = ${posts[i].post_id}`)
        posts[i].comment = comments
        posts[i].likes = likes.length
        posts[i].didUserLiked = didUserLiked.length > 0 ? true : false
        posts[i].postImages = loadPostImages
    }

    return posts.reverse()
}

async function getPostById(postId) {
    let posts = await query(`SELECT * FROM calvin.post WHERE post_id = ${postId}`) // 5 posts

    for (let i = 0; i < posts.length; i++) {
        let loadPostImages = await query(`SELECT * FROM calvin.postimages WHERE post_id = ${posts[i].post_id}`)
        posts[i].postImages = loadPostImages
    }

    return posts[posts.length - 1]
}

async function changeLikeState(userId, postId) {
    const currentTime = new Date().toISOString().slice(0, 19).replace('T', ' ')
    let likes = await query(`SELECT * FROM calvin.postlikes WHERE post_id = ${postId} AND user_id = ${userId}`)
    let like = {}

    if (likes.length === 0) {
        like = await query(`INSERT INTO calvin.postlikes (post_id, user_id, time) VALUES(${postId}, ${userId}, '${currentTime}')`)
        like = { status: 'Liked', post: postId }
    } else {
        like = await query(`DELETE FROM calvin.postlikes WHERE post_id = ${postId} AND user_id = ${userId}`)
        like = { status: 'Did not', post: postId }
    }

    return like
}

async function editPost(postId, title, bodyText, picture, postImages, newPostImages) {
    await query(`UPDATE calvin.post SET post_title = '${title}', post_article = '${bodyText}', preview_img = '${picture}' WHERE post_id = ${postId}`)
    await query(`DELETE FROM calvin.postimages WHERE post_id = ${postId}`)

    const currentTime = new Date().toISOString().slice(0, 19).replace('T', ' ')
    for (let i = 0; i < postImages.length; i++) {
        await query(`INSERT INTO calvin.postimages (post_id, image_link, time) VALUES(${postId}, '${postImages[i].image_link}', '${currentTime}')`)
    }

    for (let i = 0; i < newPostImages.length; i++) {
        const searchPostString = 'socialimages/';
        const postContentPicIndex = newPostImages[i].indexOf(searchPostString);
        let trimmedPostString = ''
        if (postContentPicIndex !== -1) {
            trimmedPostString = newPostImages[i].substring(postContentPicIndex + searchPostString.length);
        }

        await query(`INSERT INTO calvin.postimages (post_id, image_link, time) VALUES(${postId}, '${trimmedPostString}', '${currentTime}')`)
    }

    return getPostById(postId)
}

async function getAllContacts(userId) {
    const chats = await query(`SELECT chat.id, usrtwo.user_id as userId, usrtwo.username
    FROM calvin.chats as chat
    JOIN calvin.user as usr ON usr.user_id = chat.user_id_one OR usr.user_id = chat.user_id_two
    JOIN calvin.user as usrtwo ON usrtwo.user_id = chat.user_id_one OR usrtwo.user_id = chat.user_id_two AND usrtwo.user_id != ${userId}
    WHERE usr.user_id = ${userId} AND usrtwo.user_id != ${userId}`)

    return chats
}

async function getAllMessages(chatId) {
    const messages = await query(`SELECT msg.id as msgId, msg.chat_id, msg.message, msg.is_read, msg.created_at, usr.user_id, usr.username, usr.image 
    FROM calvin.messages as msg
    JOIN calvin.user as usr on usr.user_id = msg.user_id
    WHERE msg.chat_id = ${chatId}`)

    return messages
}

async function getChatData(chatId, userId) {
    const currentChat = await query(`SELECT usr.* FROM calvin.chats as chat
    JOIN calvin.user as usr On usr.user_id = chat.user_id_one or usr.user_id = chat.user_id_two AND usr.user_id != ${userId} AND chat.id = ${userId}
    WHERE (chat.user_id_one = ${userId} or chat.user_id_two = usr.user_id) or (chat.user_id_one = usr.user_id or chat.user_id_two = ${userId}) AND chat.id = ${chatId}`)

    return currentChat
}

async function insertNewMessageToChat(chat_id, user_id, message) {
    const currentTime = new Date().toISOString().slice(0, 19).replace('T', ' ')
    const newMessage = await query(`INSERT INTO calvin.messages (chat_id, user_id, message, is_read, created_at) VALUES(${chat_id}, ${user_id}, '${message}', 0, '${currentTime}')`)

    return newMessage.insertId
}

module.exports = {
    createNewUserAccount,
    validateNewLogin,
    authorizeUser,
    createPost,
    getAllPosts,
    changeLikeState,
    getPostById,
    editPost,
    checkConfirmationCode,
    getAllContacts,
    getAllMessages,
    getChatData,
    insertNewMessageToChat
}