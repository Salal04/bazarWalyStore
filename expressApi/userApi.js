require('dotenv').config();
var express = require("express");
var route = express.Router();
var getclient = require("../database/databaseconnect");
var sendVerificationEmail = require("../database/emailVerification");
const { encrypt, decrypt } = require("../database/enryption");
const { JsonWebTokenError } = require("jsonwebtoken");
const jwt =  require('jsonwebtoken');
const { getToken, verifyToken } = require("../database/jwtToken");


var dbname = "productdatabase";
var colname = "users";


// ----------------------  sign up ---------------------------------
//---------------------------------
//-----------------------------------



function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function addItem(item, role) {
  const client = getclient();
  try {
    await client.connect();
    const db = client.db(dbname);
    const code = generateCode();
    const col = db.collection(colname);
    const expireAt = new Date(Date.now() + 10 * 60 * 1000);
    const { content, iv } = encrypt(item.password.trim());
    console.log('----> : Role set:  ', role)
    await col.insertOne({
      username: item.username.trim(),
      isverified: false,
      Email: item.Email.trim(),
      record: {
        password: content,
        Vector: iv,
      },
      address: item.address,
      Role:role,
      orders: [],
      rest:{
        restCode:code,
        expire:expireAt,
        restNow:true
      }
    });
    sendVerificationEmail(item.Email, code);
  } catch (e) {
    console.error(e);
  } finally {
    await client.close();
  }
}
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateInput(req, res, next) {
  const { username, Email, address, password } = req.body;

  console.log('Validation running...');
  console.log(req.body);

  if (!username || !Email || !address || !password) {
    return res.status(400).send("Missing required fields");
  }

  if (!isValidEmail(Email)) {
    return res.status(400).send("Invalid email format");
  }

  next();
}

async function uniqueEmail(req, res, next) {
  const client = getclient();
  try {
    await client.connect();
    const col = client.db(dbname).collection(colname);
    const item = await col.findOne({ Email: req.body.Email })
    if(item && item.isverified == false ) {
      return res.status(400).send("unverified Account");
    }
    if(item && item.isverified === true)
    {
      return res.status(400).send("Account Already Exists!");
    }
    next();
  } catch (e) {
    console.error(e);
  } finally {
    await client.close();
  }
}

route.post("/SignUpUser", validateInput, uniqueEmail, async (req, res) => {
  console.log('Inside main');
  await addItem(req.body, 'Admin');
  res.status(200).send("welcome!");
});



route.post('/verfiyEmail' ,async (req , res) =>{

  const client = getclient();
    try{
        console.log('-------------- inside Verfiy Email -------------------' , req.body.code)
        await client.connect()
        const col = client.db(dbname).collection(colname)
        var a = await col.findOne({Email:req.body.Email})
        console.log(a)
        
        if(!a){
            console.log('-----------s1--------')
            return res.status(401).send('UnAuthrized Access')
        }
        const dbCode = String(a.rest.restCode).trim();
        const reqCode = String(req.body.code).trim();
        console.log("restCode Match:",reqCode === dbCode)
        console.log("restCode DB:", a.rest.restCode, "| Request:", req.body.code)
        console.log("Expire Check:", a.rest.expire > Date.now())
        console.log("restNow Check:", a.rest.restNow === true)
        console.log("Expire:", new Date(a.rest.expire), "| Now:", new Date())
        if (
          dbCode === reqCode &&
          a.rest.expire > Date.now() &&
          a.rest.restNow === true
        ){
            console.log('Hello --- ')
            await col.updateOne({Email:req.body.Email}, {$set:{isverified:true, 'rest.restNow':false}})
            console.log(" --- > Role: ",a.Role)
            console.log('---->' ,"Hello ---- >" , req.body.Email)
            const user = await col.findOne({Email:req.body.Email})
            console.log('----> , '  , user.Role, ', , <-----',a.Role)
            const token = getToken({Email:req.body.Email , Role:a.Role})
            console.log('Token ----- > ',token)
            return res.status(200).send(token)
        }
        else {
          console.log('-----------s277--------')
          return res.status(401).send('UnAuthrized Access')
        }
    }catch(e){
        console.error(e)
    }finally{
        await client.close();
    }

})

//---------------------------------
//---------------------------------
//-----------------------------------await col.updateOne({Email:req.body.Email}, {$set:{isverified:tru



// --------------------------  login --------------------------
//-------------------------------
//----------------------------------

route.get("/tryagain/:Email", async (req, res) => {
  if (req.params.Email && !isValidEmail(req.params.Email)){
    return res.status(400).send('Invalid Email or Empty')
  }
  const client = getclient();
  try {
    console.log('Try again')
    await client.connect();
    const col = client.db(dbname).collection(colname);
    const code = generateCode();
    const expireAt = new Date(Date.now() + 10 * 60 * 1000);
    sendVerificationEmail(req.params.Email, code);
    await col.updateOne({ Email: req.params.Email} , {$set:{'rest.restCode': code ,'rest.expire':expireAt}})
    console.log(await col.findOne({ Email: req.params.Email}))
    return res.status(200).send("tryAgain");
  } catch (e) {
    console.error(e);
  } finally {
    await client.close();
  }
})

route.post("/Login", async (req, res) => {
  if (!req.body){
    return res.status(404).send('Not Defined!')
  }
  const client = getclient();
  try{
    await client.connect();
    console.log("req.body --->:", req.body);
    const col = client.db(dbname).collection(colname)
    const item = await col.findOne({Email:req.body.Email })
    console.log("item --->", item);

    let pass = decrypt({
      content: item.record.password,
      iv: item.record.Vector
    });
    console.log(pass)
    if (pass == req.body.password && item.isverified){
      return res.status(200).send(getToken({Email:item.Email , Role:item.Role}))
    }
    else{
      return res.status(401).send('Wrong credentials')
    }
  }catch(e){
    console.error(e)
  }finally{
    await client.close();
  }
  
});

//---------------------------------
//---------------------------------
//---------------------------------
route.get("/verifyAdmin/:token", async (req, res) => {
  if(!req.params.token){
    return res.status(400).send('Unauthorized')
  }
  try{
    console.log("verification Started!", );
    jwt.verify(req.params.token ,process.env.jwtKey, (error , user)=>{
      console.log('--->Role: Found: ' , user?.Role)
        if (error){
                return res.status(401).send('UnAuthrized Request');
        }
        if(user.Role == 'Admin')
        {
          console.log('--->Role: --- Found: ' , user.Role)
          return res.status(200).send('Autherized!')
        }
        else{
          return res.status(400).send('Unauthorized!')
        }
    });

  }catch(e){
    console.log(e);
    return res.status(400).send('Unauthorized!')
  }
  
});

//---------------------------------
//---------------------------------
//---------------------------------




// ------------------------------rest ---------------------------------
//---------------------------------
//-----------------------------------

async function validEmail(req, res, next) {
  console.log('---> ',req.body.Email)
  const client = getclient();
  try{
    await client.connect();
    const col = client.db(dbname).collection(colname);
    const a = await col.findOne({ Email: req.body.Email });
    if (!a) {
      return res.status(404).send("Email is not Assosiated With any Account! ");
    }
    next()
  }catch(e){
    console.log(e)
  }finally{
    await client.close()
  }
}

route.post("/passwordReset", validEmail, async (req, res) => {
  const code = generateCode();
  const client = getclient();
  try{
      await client.connect();
      const expireAt = new Date(Date.now() + 10 * 60 * 1000);
      const col = client.db(dbname).collection(colname);
      const a = await col.updateOne({Email:req.body.Email} ,{$set:{'rest.restCode':code , 'rest.expire':expireAt}})
      sendVerificationEmail(req.body.Email, code);
      return res.status(200).send('verify code sent successfully')
  }catch(e){
    console.error(e)
  }
  finally
  {
    await client.close();
  }
});


route.post("/verifycode", validEmail, async (req, res) => {
  const client = getclient();
  try{
    console.log('verified . code runing .. . ')
    await client.connect();
    const expireAt = new Date(Date.now() + 10 * 60 * 1000);
    const col = client.db(dbname).collection(colname);
    const user = await col.findOne({ Email: req.body.Email });
    console.log('--> user -- > ' , user)
    console.log('codes : ' , req.body.code, '==',user.rest.restCode)
    if (new Date() < new Date(user.rest.expire) && req.body.code == user.rest.restCode) {
      
      await col.updateOne({Email:req.body.Email} , {$set:{'rest.restNow':true , 'rest.expire':expireAt}})
      return res.status(200).send('Code Verfied!')
    }
    return res.status(400).send('Not Valid Input')
     
  }catch(e){
    console.error(e)
  }
  finally
  {
    await client.close();
  }
});

route.post('/setPassword' , async (req , res) =>{

  const client = getclient();
  try{
    await client.connect();
    const col = client.db(dbname).collection(colname);
    let user = await col.findOne({"Email":req.body.Email});
    console.log(user)
    if (user && new Date() < new Date(user.rest.expire) && user.rest.restNow)
    {
      console.log('--->:  Condition true');
      const { content, iv } = encrypt(req.body.password);
      await col.updateOne({Email:req.body.Email} , {$set:{'record.password':content , 'record.vector':iv , 'rest.restNow':false}})
      const token = getToken({Email:req.body.Email , Role:user.Role})
      return res.status(200).send(token)
      
    }
    console.log('--->:  Condition false');
    return res.status(404).send('Not Found!')
  }
  catch(e)
  {
    console.log(e)
  }
  finally{
    await client.close();
  }
  
})

// ------------------------------ Add Admin ---------------------------------
//---------------------------------
//-----------------------------------

async function Autherized(req , res, next)
{
  client = getToken()
  try{
    await client.connect()
    const col = client.db(dbname).collection(colname);
    const auth = req.header['authorization']
    const token = auth && auth.split(' ')[1];
    jwt.verify(token ,process.env.jwtKey, (error , user) =>{
        if(!col.findOne({Email:user.Email})){
          return res.status(404).send('Not Found!')
        }
        if (user.role != 'Admin')
        {
          return res.status(404).send('UnAuthrized Access')
        }
    } )
    
    next();
  }catch(e)
  {
    console.log(e)
  }
  finally{
    await client.close();
  }
}

route.post("/SignUpUserAsAdmin",Autherized, async (req, res) => {
  addItem(req.body , 'Admin')
  res.send("Sign - up Admin");
});

//-------------------------------------------------------------
//----------------------- Update User -------------------------
//-------------------------------------------------------------

async function authenticateUser(req , res , next){
  client = getclient();
  try{
    const auth = req.header['authorization']
    if (!auth ){
      return res.status(404).send('Autherized Access')
    }
    const token = auth.split(' ')[1]
    const col =  client.db(dbname).collection(colname);
    users=[]
    
    jwt.verify(token , process.env.jwtKey, async (error , user) =>{
      if (error){
        return res.status(401).send('UnAuthrized Request');
      }
      await client.connect();
      let dbuser = await col.findOne({Email:user.Email})
      if(!dbuser)
        {
          return res.status(404).send('Not Found!');
        }
        next();
    })
  }
  catch(e){console.log(e)}
  finally{await client.close()}
}
route.put("/updateUser", authenticateUser ,async (req, res) => {
  client = getclient()

  try{
    await client.connect()
    const col =  client.db(dbname).collection(colname);
    await col.updateOne({Email:user.Email},{$set:{username: req.body.username,
      address: req.body.address}})
  }
  catch(e){console.log(e)}
  finally{await client.close()}
});

//---------------------------------------------------------------
//---------------------------------------------------------------
//---------------------------------------------------------------




//---------------------------------------------------------------
//---------------------(delete user)-----------------------------
//---------------------------------------------------------------
async function AutherizionDeletion(req , res, next)
{
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


route.delete("/DeleteUser", AutherizionDeletion, async (req, res) => {
  client = getToken()
  try{
    await client.connect()
    const col = client.db(dbname).collection(colname);
    await col.deleteOne({Email:req.body.Email})
  }catch(e){
    console.log(e)
  }finally{
    await client.close();
  }
  res.send("deleted!");
});


module.exports = route;