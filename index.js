const express = require('express')
const http = require('http')
const cors = require('cors')
const multer = require('multer')
const { authorizeUser, createPost, getAllPosts, changeLikeState, getPostById, editPost, checkConfirmationCode, getAllContacts, getAllMessages, getChatData, insertNewMessageToChat, getProfile, updateProfile, confirmationCodeEmailValidation, createCommunityPost, getAllCommunityPosts, loadCommunity, createCommunity } = require('./dbQueries')
const { Server } = require('socket.io')
const API_PORT = 7000
const app = express()
app.use(express.json())
app.use(express.urlencoded())
app.use(cors())

const server = http.createServer(app)

server.listen(API_PORT, () => console.log('Listening'))

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'C:/Users/USER/Desktop/front/lerafront/src/socialimages')
    },
    filename: function (req, file, cb) {
        const searchString = '.';
        const postContentIndex = file.originalname.indexOf(searchString);
        let postfix = ''
        if (postContentIndex !== -1) {
            postfix = file.originalname.substring(postContentIndex + searchString.length);
        }

        console.log(file)

        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null, file.fieldname + '-' + uniqueSuffix + `.${postfix}`)
    }
})
const upload = multer({ storage: storage })

//////////////////////////////////////////////////////////////////
app.post('/uploadfile', upload.single('file'), async function (req, res) {
    res.send({ result: req.file.path })
})

app.post('/uploadfiles', upload.array('file'), async function (req, res) {
    res.send({ result: req.files.map(file => file.path) })
})

app.post('/confirmregistration', async (req, res) => {
    const code = req.body.code

    const check = await checkConfirmationCode(code)

    res.send({ 'data': check })
})

app.post('/authorize', async (req, res) => {
    const username = req.body.login
    const password = req.body.password

    const user = await authorizeUser(username, password)

    res.send({ 'data': user })
})

app.post('/createpost', async (req, res) => {
    const title = req.body.title
    const bodyText = req.body.bodyText
    const picture = req.body.picture
    const userId = req.body.userId
    const postImages = req.body.postImages

    const creationOfPost = await createPost(title, bodyText, picture, userId, postImages)

    res.send({ 'data': creationOfPost })
})

app.post('/createcommunitypost', async (req, res) => {
    const title = req.body.title
    const bodyText = req.body.bodyText
    const picture = req.body.picture
    const userId = req.body.userId
    const postImages = req.body.postImages
    const communityId = req.body.communityId

    const creationOfPost = await createCommunityPost(title, bodyText, picture, userId, postImages, communityId)

    res.send({ 'data': creationOfPost })
})

app.post('/createcommunity', async (req, res) => {
    const title = req.body.title
    const details = req.body.details
    const picture = req.body.picture
    const userId = req.body.userId

    const createdCommunity = await createCommunity(title, details, picture, userId)

    res.send({ 'data': createdCommunity })
})

app.post('/loadposts', async (req, res) => {
    const userId = req.body.userId

    const allPosts = await getAllPosts(userId)

    res.send({ 'data': allPosts })
})


app.post('/loadcommunityposts', async (req, res) => {
    const userId = req.body.userId
    const communityId = req.body.communityId

    const allPosts = await getAllCommunityPosts(communityId, userId)

    res.send({ 'data': allPosts })
})

app.post('/loadcommunitydetails', async (req, res) => {
    const communityId = req.body.communityId

    const details = await loadCommunity(communityId)

    res.send({ 'data': details })
})

app.post('/likepost', async (req, res) => {
    const userId = req.body.userId
    const postId = req.body.postId

    const like = await changeLikeState(userId, postId)

    res.send({ 'data': like })
})

app.post('/loadeditpost', async (req, res) => {
    const postId = req.body.postId

    const postToEdit = await getPostById(postId)

    res.send({ 'data': postToEdit })
})

app.post('/editpost', async (req, res) => {
    const postId = req.body.postId
    const title = req.body.title
    const bodyText = req.body.bodyText
    const picture = req.body.picture
    const postImages = req.body.postImages
    const newPostImages = req.body.newPostImages

    const editedPost = await editPost(postId, title, bodyText, picture, postImages, newPostImages)

    res.send({ 'data': editedPost })
})

app.post('/getallchats', async (req, res) => {
    const userId = req.body.userId
    const chats = await getAllContacts(userId)

    res.send({ 'data': chats })
})

app.post('/getallchatmessages', async (req, res) => {
    const chatId = req.body.chatId
    const messages = await getAllMessages(chatId)

    res.send({ 'data': messages })
})

app.post('/currentchat', async (req, res) => {
    const chatId = req.body.chatId
    const userId = req.body.userId
    const chat = await getChatData(chatId, userId)

    res.send({ 'data': chat })
})

app.post('/profile', async (req, res) => {
    const userId = req.body.userId
    const profile = await getProfile(userId)

    res.send({ 'data': profile })
})

app.post('/updateprofile', async (req, res) => {
    const userId = req.body.userId
    const username = req.body.username
    const password = req.body.password
    const userImage = req.body.userImage

    const update = await updateProfile(userId, username, password, userImage)

    res.send({ 'data': update })
})

app.post('/confirmrestemailcode', async (req, res) => {
    const userId = req.body.userId
    const code = req.body.code
    const email = req.body.email
    const password = req.body.password
    const image = req.body.image

    const isConfirmed = await confirmationCodeEmailValidation(userId, code, email, password, image)

    res.send({ 'data': isConfirmed })
})


const io = new Server(server, {
    transports: ['websocket', 'polling'],
    cors: {
        origin: 'http://localhost:3000',
        methods: ['GET', 'POST']
    }
})


io.on('connection', (socket) => {
    socket.on('join-chat', (data) => {
        socket.join(data.userId)
    })

    socket.on('send-message', async (data) => {
        console.log(data)
        const currentTime = new Date().toISOString().slice(0, 19).replace('T', ' ')
        const newMessage = await insertNewMessageToChat(data.chatId, data.userId, data.message)
        const messageToFront = {
            id: newMessage,
            chat_id: data.chatId,
            user_id: data.userId,
            message: data.message,
            is_read: 0,
            created_at: currentTime,
            username: data.username
        }
        socket.to(data.receiverID).emit('recieve-message', messageToFront)
        io.to(data.userId).emit('recieve-message', messageToFront)
    })


})