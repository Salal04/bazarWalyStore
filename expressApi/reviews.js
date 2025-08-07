var express = require('express')
var route = express.Router();
var jwt =require('jsonwebtoken');
const getClient = require('../database/databaseconnect');
const { FindCursor, ObjectId } = require('mongodb');
const {getToken ,verifyToken } = require('../database/jwtToken')
require('dotenv').config();

var dbname = "productdatabase";
var colname = "Products";



function authenticate(req , res , next){
    try{
        const auth = req.headers['authorization']
        const token = auth && auth.split(' ')[1];
        jwt.verify(token , process.env.jwtKey ,(error , user)=>{
            if(error){
              return res.status(401).send('Unauthorized!');
            }
            if(user && (user.email == req.body.email || user.Role == 'Admin') )
            {
              next();
            }
            else{
              return res.status(401).send('autherized!')
            }
        })
        
      }catch(e)
      {
        console.log(e)
      }
}

function extractEmailFromToken(token) {
  try {
      const decoded = jwt.verify(token, process.env.jwtKey); // 👈 yahan apka JWT secret hona chahiye
      return decoded.Email; // 👈 assuming `email` payload me hai
  } catch (error) {
      console.error('Invalid token:', error);
      return null;
  }
}

route.post('/addReview', verifyToken, async (req, res) => {
  console.log('---> ' , req.body)
  console.log('----------------------- helllo there ??? -----------')
  const client = getClient();
  try {
    await client.connect();
    const col = client.db(dbname).collection(colname);

    const token = req.headers['authorization'].split(' ')[1];
    console.log('---> token ---- ', token )
    const userEmail = extractEmailFromToken(token);

    const user = await client.db(dbname).collection('users').findOne({ Email: userEmail });
    
    console.log('-----',req.body.id)
    await col.updateOne(
      { _id: new ObjectId(req.body.id) },
      {
        $inc: { ratingCount: 1 },
        $push: {
          reviews: {
            username: user.name,
            rating: req.body.rating,
            description: req.body.description,
          },
        },
      }
    );
    
    return res.status(200).send('Review Added Successfully');
  } catch (e) {
    console.log(e);
    res.status(500).send('Error adding review');
  } finally {
    await client.close();
  }
});


route.delete('/DeleteReview/:id/:productID' ,authenticate, async (req, res) => {
    client = getClient()
    try{
      await client.connect();
      const col = client.db().collection();
      await col.updateOne({_id:new ObjectId(req.params.productID)

      } , {$pull: {reviews:{

        userId:new ObjectId(req.params.id),

      }}

      })

    }catch(e)
    {
      console.log(e)
    }
    finally{
      await client.close();
    }

})




module.exports= route;