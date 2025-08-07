var express = require('express')
var app = express();
var productApis = require('./expressApi/productApi')
var users = require('./expressApi/userApi')
var category = require('./expressApi/catagory')
var bannars =require('./expressApi/bannarsApi')
var product =require('./expressApi/productApi')
var reviews = require('./expressApi/reviews')
var blogs = require('./expressApi/blogs')

// server.js ya index.js file mein:
const cors = require('cors');
app.use(cors()); // ✅ Enable CORS for all origins

console.log('users   --->    =', typeof users);

app.use(cors({
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true 
  }));

app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));  
app.use('/api' , users)
app.use('/api' ,category)
app.use('/api',bannars);
app.use('/api',product);
app.use('/api',reviews);
app.use('/api',blogs);


app.use('/uploads', express.static('uploads'));

app.listen(3001 , ()=>{
    console.log('server is runing now')
})