const express = require('express')
const http = require('http')
const cors = require('cors')
const multer = require('multer')
const { createNewUserAccount, authorizeUser, createPost, getAllPosts, changeLikeState, getPostById } = require('./dbQueries')

const API_PORT = 7000
const app = express()
app.use(express.json())
app.use(express.urlencoded())
app.use(cors())

const server = http.createServer(app)

server.listen(API_PORT, () => console.log('Listening'))

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'C:/Users/Snizinka/Desktop/lesson/src/socialimages')
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

app.post('/signupuser', async (req, res) => {
    const username = req.body.login
    const password = req.body.password

    const createUser = await createNewUserAccount(username, password)

    res.send({ 'data': createUser })
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

app.post('/loadposts', async (req, res) => {
    const userId = req.body.userId

    const allPosts = await getAllPosts(userId)

    res.send({ 'data': allPosts })
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