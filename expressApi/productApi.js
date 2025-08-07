var express = require('express')
const multer = require('multer');
var route = express.Router();
var GetClient = require('../database/databaseconnect');
var jwt = require('jsonwebtoken');
const { param } = require('./userApi');
const path = require('path');
const qs = require('qs');
const { ObjectId } = require('mongodb');


var dbname = "productdatabase";
var colname = "Products";


const storage = multer.diskStorage({
    destination:function(req, file , cb){
        cb(null , path.join(__dirname, '../uploads'))
    },
    filename: function(req, file , cb){
        cb(null , `${Date.now()}-${file.originalname}`);
    }
})
const upload = multer({ storage: storage });

route.get('/getProductsAll', async (req , res)=>{
    const client = GetClient()
    try{

        client.connect()
        const col = client.db(dbname).collection(colname);
        const products = await col.find({}, {
            projection: {  imges:1,discount:1,description:1,name: 1, price: 1, category: 1, _id: 1,size:1,rating:1 }
          }).toArray();

          res.json(products);

    }catch(e){
        console.error(e)
    }
    finally{
        await client.close()
    }
} )


route.get('/getProductsRelated/:relate', async (req, res) => {
    const client = GetClient();
    try {
        await client.connect();

        const col = client.db(dbname).collection(colname);
        const products = await col.find({}).toArray();

        const relate = req.params.relate;

        const act = products.find(p => p.name.includes(relate));

        const related = products.filter(p =>
            p.name !== relate && (
                p.tags?.includes(relate) ||
                p.category === relate
            )
        );
        console.log('---> --- >  ' , act)
        return res.json({
            actual: [act],
            related: related
        });

    } catch (e) {
        console.error(e);
        return res.status(500).send('Internal Error');
    } finally {
        await client.close();
    }
});



route.get('/GetProductFiltered', async (req, res) => {
  const client = GetClient();
  try {
    const rawQuery = req._parsedUrl.query;
    const parsedQuery = qs.parse(rawQuery); // 👈 This gives proper nested structure

    console.log('Parsed Query:', parsedQuery); // { discount: { gt: '0' } }

    let queryStr = JSON.stringify(parsedQuery);
    queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);
    const mongoQuery = JSON.parse(queryStr);

    await client.connect();
    const col = client.db(dbname).collection(colname);
    console.log('mongo Query::: ' , mongoQuery)
    const data = await col.find(mongoQuery).toArray();
    console.log('data --->  ' , data)
    res.status(200).json(data);
  } catch (e) {
    console.error(e);
    res.status(400).send('Something went wrong!');
  } finally {
    await client.close();
  }
});

route.get('/GetProductDiscounted/:number', async (req, res) => {
    const client = GetClient();
    try {
      console.log('--> discount : ---> ' , req.params.number)
      await client.connect();
      const col = client.db(dbname).collection(colname);
      const data = await col.find({discount:{$gt:Number(req.params.number)}}).toArray();
      res.status(200).json(data);
    } catch (e) {
      console.error(e);
      res.status(400).send('Something went wrong!');
    } finally {
      await client.close();
    }
  });


route.get('/getProductsById/:id', async (req , res)=>{
    const client = GetClient()
    try{

        client.connect()
        const col = client.db(dbname).collection(colname);
        const data = await col.findOne({_id: new ObjectId(req.params.id)})
        res.json(data);
    }catch(e){
        console.error(e)
    }
    finally{
        await client.close()
    }
} )

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

route.post('/addProduct',authenticate, upload.array('productImg' , 5) , async (req , res ) => {
    const client = GetClient();
    try{
        console.log('--->inside add product ..... ')
        console.log('--->connected Data ..... ' ,req.body )
        await client.connect();
        const col = client.db(dbname).collection(colname)
        await col.insertOne({
            name:req.body.pname,
            imges:req.files.map(file=>`uploads/${file.filename}`),
            qty:req.body.qty,
            size:req.body.size,
            reviews:[],
            description:req.body.description,
            price:req.body.price,
            category:req.body.category,
            brand:req.body.brand,
            tags:req.body.tags,
            discount:0,
            rating:'5',
            ratingCount:0
        })
        res.status(201).send("Product Added Successfully");

    }catch(e){
        console.error(e)
        return res.status(500).send("Server error adding product");

    }finally{
        await client.close();
    }

})

route.delete('/DeleteProduct/:id' , authenticate, async (req, res) => {
    const client = GetClient();
    try{
        await client.connect();
        const col = client.db(dbname).collection(colname)
        const result= await col.deleteOne({_id:new ObjectId(req.params.id)})
        if(result.deletedCount ==1 )
        {
            return res.status(200).send('Deleted Success Fully')
        }
        else{
            return res.status(400).send('operation Failed')
        }
    }catch(e){
        console.log(e)

    }finally{
        await client.close();
    }
})

route.put('/updateProducts/:id' ,authenticate, async (req , res) => {
    const client = GetClient();
    try{
        await client.connect();
        const col = client.db(dbname).collection(colname)
        const result = await col.updateOne(
            { _id: new ObjectId(req.params.id) },
            { $set: {
                name: req.body.pname,
                qty: req.body.qty,
                size: req.body.size,
                description: req.body.description,
                price: req.body.price,
                category: req.body.category,
                brand: req.body.brand,
                tags: req.body.tags
            }}
        );
        if(result.modifiedCount ==1 )
        {
            return res.status(200).send('update Success Fully')
        }
        else{
            return res.status(400).send('operation Failed')
        }
    }catch(e){
        console.log(e)

    }finally{
        await client.close();
    }
})

module.exports = route;