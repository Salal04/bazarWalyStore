// expressApi/catagory.js

const fs = require('fs');
const path = require('path');
const express = require('express');
const multer = require('multer');
const { ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const GetClient = require('../database/databaseconnect');
const { Console } = require('console');

const route = express.Router();
const dbname = 'productdatabase';
const colname = 'blogs';

// 1️⃣ uploads directory path define aur ensure karo
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 2️⃣ Multer storage configuration
const storage = multer.diskStorage({
  destination(req, file, cb) {
    // uploadDir ab yahan defined hai
    cb(null, uploadDir);
  },
  filename(req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const upload = multer({ storage });

// 3️⃣ Authentication middleware
function authenticate(req, res, next) {
  const auth = req.headers['authorization'];
  const token = auth && auth.split(' ')[1];
  jwt.verify(token, process.env.jwtKey, (error, user) => {
    console.log('Role: ' ,user.Role)
    if (error || !user || user.Role !== 'Admin') {
      return res.status(401).send('Unauthorized');
    }
    next();
  });
}

// 4️⃣ Routes
route.get('/getBlogs/:cnt', async (req, res) => {
  console.log('---> inside blogs ---- ')
  const client = GetClient();
  try {
    await client.connect();
    let data = [];
    if(Number(req.params.cnt) == 0){
      data = await client.db(dbname).collection(colname).find().toArray();
    }
    else{
      data = await client.db(dbname).collection(colname).find().limit(Number(req.params.cnt)).toArray();
    }
    console.log('sending ... ' , data)
    return res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).send('Server Error');
  } finally {
    await client.close();
  }
});

route.post(
  '/addBlogs',
  authenticate,
  upload.single('blogImage'),
  async (req, res) => {
    const client = GetClient();
    try {
      console.log(req.file.path, ':', req.body.name);
      await client.connect();
      await client.db(dbname).collection(colname).insertOne({
        img:`/uploads/${req.file.filename}`,
        title:req.body.title,
        description:req.body.description
      });
      res.status(201).send('Category added successfully');
    } catch (e) {
      console.error(e);
      res.status(400).send('Something went wrong');
    } finally {
      await client.close();
    }
  }
);

route.delete(
  '/DeleteCatagory/:id',
  authenticate,
  async (req, res) => {
    const client = GetClient();
    try {
      await client.connect();
      const result = await client.db(dbname).collection(colname)
        .deleteOne({ _id: new ObjectId(req.params.id) });
      if (result.deletedCount === 1) {
        return res.status(200).send('Deleted successfully');
      } else {
        return res.status(404).send('Category not found');
      }
    } catch (e) {
      console.error(e);
      res.status(500).send('Server Error');
    } finally {
      await client.close();
    }
  }
);

module.exports = route;
