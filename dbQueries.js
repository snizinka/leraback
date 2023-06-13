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
        let isBlocked = await query(`SELECT * FROM calvin.posts_reports WHERE post_id = ${posts[i].post_id}`)

        if (isBlocked.length > 0) {
            let removed = false
            for(let r = 0; r < isBlocked.length; r++) {
                if (isBlocked[r].reportStatus === 'blocked') {
                    posts.splice(i, 1)
                    removed = true
                }
            }
            if (removed === true) {
                continue
            }
        }

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

async function getAllCommunityPosts(communityId, userId) {
    let posts = await query(`SELECT * FROM calvin.post WHERE community_id = ${communityId}`)

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

async function loadCommunity(communityId, userId) {
    let community = await query(`SELECT * FROM calvin.community WHERE id = ${communityId}`) // [{community_name, id ....}] 1
    const isFollowing = await query(`SELECT * FROM calvin.community_subs WHERE user_id = ${userId} AND community_id = ${communityId}`)

    const currentCommunity = {
        ...community[community.length - 1],
        isFollowing: isFollowing.length > 0 ? true : false
    }

    return currentCommunity // {community_name, id ....}
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
    JOIN calvin.user as usr On usr.user_id = chat.user_id_one or usr.user_id = chat.user_id_two AND usr.user_id != ${userId} AND chat.id = ${chatId}
    WHERE (chat.user_id_one = ${userId} and chat.user_id_two = usr.user_id) or (chat.user_id_one = usr.user_id and chat.user_id_two = ${userId}) AND chat.id = ${chatId}`)

    return currentChat
}

async function insertNewMessageToChat(chat_id, user_id, message) {
    const currentTime = new Date().toISOString().slice(0, 19).replace('T', ' ')
    const newMessage = await query(`INSERT INTO calvin.messages (chat_id, user_id, message, is_read, created_at) VALUES(${chat_id}, ${user_id}, '${message}', 0, '${currentTime}')`)

    return newMessage.insertId
}

async function getProfile(userId, watcherId, needDetails) {
    const profile = await query(`SELECT * FROM calvin.user WHERE user_id = ${userId}`)
    const isFollowing = await query(`SELECT * FROM calvin.chats WHERE (user_id_one = ${userId} AND user_id_two = ${watcherId}) OR  (user_id_two = ${userId} AND user_id_one = ${watcherId})`)

    let gallary = []
    if (needDetails) {
        gallary = await query(`SELECT * FROM calvin.postimages ORDER BY postimage_id DESC LIMIT 2`)
    }

    const profileData = {
        ...profile[profile.length - 1],
        isFollowing: isFollowing.length > 0 ? true : false,
        gallary: gallary
    }

    return profileData
}

async function updateProfile(userId, username, password, userImage) {
    const checkEmail = await query(`SELECT username FROM calvin.user WHERE username = '${username}' and user_id = ${userId}`)

    if (checkEmail.length === 0) {
        const getmail = await query(`SELECT username FROM calvin.user WHERE user_id = ${userId}`)
        const confirmationCode = Math.floor(100000 + Math.random() * 80000)
        console.log(getmail[0].username)
        const mailOptions = {
            from: 'ВЖиті <snizinkavolshebna@gmail.com>',
            to: getmail[0].username,
            subject: 'Here is your confirmation code',
            text: confirmationCode.toString()
        }

        const d = await new Promise((res, rej) => {
            transporter.sendMail(mailOptions, function (err, info) {
                if (err) {
                    rej({ error: 'Mail not found' })
                } else {
                    res({ confirmationCode: confirmationCode })
                }
            })
        })

        await query(`INSERT INTO calvin.confirmations (user_id, confirmation_code, confirmation_type) VALUES(${userId}, '${confirmationCode}', 'update_mail')`)

        return { confirmationCode: confirmationCode, isUpdated: false }
    } else {
        const update = await query(`UPDATE calvin.user set password = '${password}', image = '${userImage}'`)

        return { isUpdated: true }
    }
}

async function confirmationCodeEmailValidation(userId, code, email, password, image) {
    console.log(userId, code)
    const isValid = await query(`SELECT confirmation_code from calvin.confirmations WHERE user_id = ${userId} AND confirmed is NULL`)

    if (isValid.length > 0) {
        if (isValid[isValid.length - 1].confirmation_code.toString() === code.toString()) {
            const searchString = 'socialimages/';
            const postContentIndex = image.indexOf(searchString);
            let trimmedString = ''
            if (postContentIndex !== -1) {
                trimmedString = image.substring(postContentIndex + searchString.length);
            }

            await query(`UPDATE calvin.confirmations set confirmed = 1 WHERE user_id = ${userId}`)
            await query(`UPDATE calvin.user set username = '${email}', password = '${password}', image = '${trimmedString}' WHERE user_id = ${userId}`)

            return 'Confirmed'
        }
    } else {
        return 'Faild'
    }
}



async function createCommunityPost(title, bodyText, picture, userId, postImages, communityId) {
    const searchString = 'socialimages/';
    const postContentIndex = picture.indexOf(searchString);
    let trimmedString = ''
    if (postContentIndex !== -1) {
        trimmedString = picture.substring(postContentIndex + searchString.length);
    }

    const currentTime = new Date().toISOString().slice(0, 19).replace('T', ' ')
    const createdPost = await query(`INSERT INTO calvin.post (post_title, post_article, user_id, preview_img, time, community_id) VALUES('${title}', '${bodyText}', ${userId}, '${trimmedString}', '${currentTime}', ${communityId})`)

    for (let i = 0; i < postImages.length; i++) {
        const searchPostString = 'socialimages/';
        const postContentPicIndex = postImages[i].indexOf(searchPostString);
        let trimmedPostString = ''
        if (postContentPicIndex !== -1) {
            trimmedPostString = postImages[i].substring(postContentPicIndex + searchPostString.length);
        }

        await query(`INSERT INTO calvin.postimages (post_id, image_link, time) VALUES(${createdPost.insertId}, '${trimmedPostString}', '${currentTime}')`)
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

async function createCommunity(title, details, picture, userId) {
    const searchString = 'socialimages/';
    const postContentIndex = picture.indexOf(searchString);
    let trimmedString = ''
    if (postContentIndex !== -1) {
        trimmedString = picture.substring(postContentIndex + searchString.length);
    }

    const currentTime = new Date().toISOString().slice(0, 19).replace('T', ' ') // CURRENT TIME
    const createdCommunity = await query(`INSERT INTO calvin.community (community_name, description, image, creator_id, created_at) VALUES('${title}', '${details}', '${trimmedString}', ${userId}, '${currentTime}')`)

    return createdCommunity.insertId
}

async function findCommunities(title) {
    const communities = await query(`SELECT * FROM calvin.community WHERE community_name LIKE '%${title}%' OR description LIKE '%${title}%'`)

    return communities
}

async function followOrUnfollow(userId, communityId) {
    let didFollowed = false
    const isFollowing = await query(`SELECT * FROM calvin.community_subs WHERE user_id = ${userId} AND community_id = ${communityId}`)

    if (isFollowing.length === 0) {
        const currentTime = new Date().toISOString().slice(0, 19).replace('T', ' ') // CURRENT TIME
        await query(`INSERT INTO calvin.community_subs (community_id, user_id, created_at) VALUES(${communityId}, ${userId}, '${currentTime}')`)
        didFollowed = true
    } else {
        await query(`DELETE FROM calvin.community_subs WHERE user_id = ${userId} AND community_id = ${communityId}`)
    }

    return didFollowed
}

async function followUser(userId, followerId) {
    let didFollowed = false
    const isFollowing = await query(`SELECT * FROM calvin.chats WHERE (user_id_one = ${userId} AND user_id_two = ${followerId}) OR (user_id_two = ${userId} AND user_id_one = ${followerId})`)

    if (isFollowing.length === 0) {
        const currentTime = new Date().toISOString().slice(0, 19).replace('T', ' ') // CURRENT TIME
        await query(`INSERT INTO calvin.chats (user_id_one, user_id_two, created_at, created_by) VALUES(${userId}, ${followerId}, '${currentTime}', ${followerId})`)
        didFollowed = true
    } else {
        await query(`DELETE FROM calvin.chats WHERE (user_id_one = ${userId} AND user_id_two = ${followerId}) OR (user_id_two = ${userId} AND user_id_one = ${followerId})`)
    }

    return didFollowed
}

async function findUsers(username) {
    const users = await query(`SELECT * FROM calvin.user WHERE username LIKE '%${username}%'`)

    return users
}


async function reportOnPost(postId, userId, reportStatement) {
    const currentTime = new Date().toISOString().slice(0, 19).replace('T', ' ') // CURRENT TIME
    const report = await query(`INSERT INTO calvin.posts_reports (post_id, user_id, reportText, created_at) VALUES(${postId}, ${userId}, '${reportStatement}', '${currentTime}')`)

    return report
}

async function fetchReports(postTitle, reportId) {
    let reports = []

    if (reportId === undefined) {
        reports = await query(`SELECT * FROM calvin.posts_reports as report
        JOIN calvin.post as pst on pst.post_id = report.post_id
        WHERE pst.post_title LIKE '%${postTitle}%'`)
    } else {
        reports = await query(`SELECT * FROM calvin.posts_reports as report
        JOIN calvin.post as pst on pst.post_id = report.post_id
        WHERE report.id = ${reportId}`)
    }

    return reports
}


async function blockPost(reportId) {
    const report = await query(`SELECT * FROM calvin.posts_reports WHERE id = ${reportId}`)
    let reportStatus = true
    if (report.length > 0) {
        if (report[0].reportStatus !== 'blocked') {
            reportStatus = false
            await query(`UPDATE calvin.posts_reports SET reportStatus = 'blocked' WHERE id = ${reportId}`)
        } else {
            await query(`UPDATE calvin.posts_reports SET reportStatus = 'unblocked' WHERE id = ${reportId}`)
        }
    }

    return reportStatus
}

async function editMessage(messageId, message) {
    await query(`UPDATE calvin.messages SET message = '${message}' WHERE id = ${messageId}`)
    const selectMessage = await query(`SELECT * FROM calvin.messages WHERE id = ${messageId}`)

    return selectMessage
}

async function removeMessage(messageId) {
    await query(`DELETE FROM calvin.messages WHERE id = ${messageId}`)
}

async function changeSeenStatus(messageId) {
    await query(`UPDATE calvin.messages SET is_read = 1 WHERE id = ${messageId}`)
}

module.exports = {
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
    insertNewMessageToChat,
    getProfile,
    updateProfile,
    confirmationCodeEmailValidation,
    createCommunityPost,
    getAllCommunityPosts,
    loadCommunity,
    createCommunity,
    findCommunities,
    followOrUnfollow,
    findUsers,
    followUser,
    reportOnPost,
    fetchReports,
    blockPost,
    editMessage,
    removeMessage,
    changeSeenStatus
}