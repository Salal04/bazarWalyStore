require('dotenv').config();
const jwt = require('jsonwebtoken');


function getToken(payload){
    return jwt.sign(payload , process.env.jwtKey)
}

function verifyToken(req , res , next){
    console.log('Token verifiction started! .......')
    const auth = req.headers['authorization']
    const token = auth && auth.split(' ')[1];
    if(!token)
        {
            console.log('Token verifiction Ended!error .......')
            return res.status(401).send('UnAuthrized Access')
        }
        jwt.verify(token ,process.env.jwtKey, (error , user)=>{
            if (error){
            console.log('Token verifiction end!error .......')
            return res.status(401).send('UnAuthrized Request');
        }
    });
    console.log('Token verifiction started! not error  .......')
    next();
}


module.exports = {getToken ,verifyToken }