const { text } = require('express')
const dbSettings = require('./dbSettings')
const util = require('util')
const query = util.promisify(dbSettings.query).bind(dbSettings)

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

async function createPost(title, bodyText, picture, userId) {
    const searchString = 'socialimages/';
    const postContentIndex = picture.indexOf(searchString);
    let trimmedString = ''
    if (postContentIndex !== -1) {
        trimmedString = picture.substring(postContentIndex + searchString.length);
    }

    const currentTime = new Date().toISOString().slice(0, 19).replace('T', ' ')
    const createdPost = await query(`INSERT INTO calvin.post (post_title, post_article, user_id, preview_img, time) VALUES('${title}', '${bodyText}', ${userId}, '${trimmedString}', '${currentTime}')`)

    let loadNewPost = await query(`SELECT * FROM calvin.post WHERE post_id = ${createdPost.insertId}`)
    let comments = await query(`SELECT * FROM calvin.comments WHERE post_id = ${loadNewPost[0].post_id}`)
    let likes = await query(`SELECT * FROM calvin.postlikes WHERE post_id = ${loadNewPost[0].post_id}`)
    let didUserLiked = await query(`SELECT * FROM calvin.postlikes WHERE post_id = ${loadNewPost[0].post_id} AND user_id = ${userId}`)
    loadNewPost[0].comment = comments
    loadNewPost[0].likes = likes.length
    loadNewPost[0].didUserLiked = didUserLiked.length > 0 ? true : false

    return { status: createdPost.insertId !== undefined ? 'Success' : 'Failure', newPost: loadNewPost[0] }
}

async function getAllPosts(userId) {
    let posts = await query(`SELECT * FROM calvin.post`) // 5 posts

    for (let i = 0; i < posts.length; i++) {
        let comments = await query(`SELECT * FROM calvin.comments WHERE post_id = ${posts[i].post_id}`)
        let likes = await query(`SELECT * FROM calvin.postlikes WHERE post_id = ${posts[i].post_id}`)
        let didUserLiked = await query(`SELECT * FROM calvin.postlikes WHERE post_id = ${posts[i].post_id} AND user_id = ${userId}`)
        posts[i].comment = comments
        posts[i].likes = likes.length
        posts[i].didUserLiked = didUserLiked.length > 0 ? true : false
    }

    return posts
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


module.exports = {
    createNewUserAccount,
    validateNewLogin,
    authorizeUser,
    createPost,
    getAllPosts,
    changeLikeState
}