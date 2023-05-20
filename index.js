const express = require('express')
const http = require('http')
const cors = require('cors')
const multer = require('multer')
const { getAllUsers, getAllPosts, createPost } = require('./dbQueries')

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
app.post('/users', async (req, res) => {
    const data = await getAllUsers()

    res.send({'data' : data})
})

app.get('/posts', async (req, res) => {
    const data = await getAllPosts()

    res.send({'posts' : data})
})

app.post('/createpost', async (req, res) => {
    const frontTitle = req.body.title
    const frontBody = req.body.bodyText
    const frontImage = req.body.picture

    const data = await createPost(frontTitle, frontBody, frontImage)

    res.send({'result': data})
})

app.post('/loadallposts', async (req, res) => {
    const data = await getAllPosts()

    res.send({'result': data})
})

app.post('/uploadfile', upload.single('file'), async function (req, res) {
   
    res.send({ result: req.file.path })
})
