var express = require('express');
const multer = require('multer');
var route = express.Router();
const path = require('path');
const GetClient = require('../database/databaseconnect');
const { ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const { Console } = require('console');
const dbname = 'productdatabase';
const colname = 'bannars';


function authenticate(req , res , next){
    const auth = req.headers['authorization']
    const token = auth && auth.split(' ')[1]
    jwt.verify(token , process.env.jwtKey , (error, user)=>{
        if(error){
            return res.status(401).send('Unauthorized');
        }
        if(user.Role!='Admin')
        {
            return res.status(401).send('Unauthorized');
        }
        next();
    })
    
    
}


route.get('/getAllBanners/:type',  async (req , res)=>{
    const client = GetClient()
    try{

        await client.connect()
        const col = client.db(dbname).collection(colname);
        const data = await col.find({type:req.params.type}).toArray()
        return res.json(data);

    }catch(e){
        console.error(e)
    }
    finally{
        await client.close()
    }
} )

const storage = multer.diskStorage({
    destination:function(req, file , cb){
        cb(null , path.join(__dirname, '../uploads'))
    },
    filename:function(req , file, cb){
        cb(null ,`${Date.now()}-${file.originalname}`)
    }


})
const upload = multer({ storage: storage });


route.post('/addBannar' ,authenticate, upload.single('bannars'), async (req , res ) => {
    const client = GetClient()
    try{
        console.log(req.body.url ,' : ' ,req.body.type ,' : ', `/uploads/${req.file.filename}`  )
        await client.connect()
        const col = client.db(dbname).collection(colname);
        const data = await col.insertOne({
            img:`/uploads/${req.file.filename}`,
            url:req.body.url,
            type:req.body.type,
        })
        res.status(201).send("Banner added successfully");
    }catch(e){
        console.error(e)
    }
    finally{
        await client.close()
    }
})

route.delete('/DeleteBannar/:id' ,authenticate,  async (req, res) => {
    const client = GetClient()
    try{

        await client.connect()
        const col = client.db(dbname).collection(colname);
        const data = await col.deleteOne({_id: new ObjectId(req.params.id)})
        if(data.deletedCount == 1)
        {
            return res.status(200).send('deleted Successfully')
        }
        else {
            return res.status(404).send("Banner not found");
        }
    }catch(e){
        console.error(e)
    }
    finally{
        await client.close()
    }
})
module.exports= route;