const express = require('express')
const http = require('http')
const cors = require('cors')
const { getAllUsers, getAllPosts, createPost } = require('./dbQueries')

const API_PORT = 7000
const app = express()
app.use(express.json())
app.use(express.urlencoded())
app.use(cors())

const server = http.createServer(app)

server.listen(API_PORT, () => console.log('Listening'))
//////////////////////////////////////////////////////////////////
app.post('/users', async (req, res) => {
    const data = await getAllUsers()

    res.send({'data' : data})
})

app.get('/posts', async (req, res) => {
    const data = await getAllPosts()

    res.send({'posts' : data})
})

app.get('/createpost', async (req, res) => {
    const title = req.body.title 
    const bodyText = req.body.bodyText 
    const picture = req.body.picture

    const data = await createPost(title, bodyText, picture)
    const result = data.insertId !== undefined ? 'done' : 'failed'

    res.send({'posts' : result})
})