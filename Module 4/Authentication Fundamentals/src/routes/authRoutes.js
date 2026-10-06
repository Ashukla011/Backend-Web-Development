const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs')
const {PrismaClient} = require("@prisma/client")

const prisma = new PrismaClient()

router.post('/register', async (req, res, next) => {
  // TODO: validate, hash, persist, and return a safe 201 response.
  const {name, email, password} = req.body ;
  if(
    typeof name !=='string' || !name.trim() ||
    typeof email !== 'string' || !email.trim() ||
    typeof password !== 'string' || !password.trim()
  ){
    return res.status(400).json({
      error: {code:"INVALID_INPUT" , message: "Name, emial, and passowrd are required"}
    })
  }
  const normalizedEmail = email.trim().toLowerCase();

  try{
   
    const passwordHash = await bcrypt.hash(password, 12)
    
    const user = await prisma.user.create({
      data:{
        name: name.trim(),
        email: normalizedEmail,
        passwordHash
      },
      select : {id: true, name: true, email:true}
    });
    return res.status(201).json(user);
  }catch(error){
    if(error.code == "P2002"){
      return res.status(409).json({
        error:{code: "EMAIL_EXISTS", message: "Emial already registered"}
      })
    }
    return next(error)
  }
  
  // return res.status(501).json({ error: { code: 'NOT_IMPLEMENTED', message: 'Implement registration' } });
});

router.post('/login', async (req, res, next) => {
  // TODO: verify credentials and return the required generic failure response.
  const {email, password} = req.body
   if(
     typeof email !=='string' || !email.trim() ||
    typeof password !== 'string' || ! password.trim() 
   ){
    return res.status(400).json({
      error: {
        code: 'INVALID_INPUT',
        message: 'Email and password are required'
      }
    })
   }

  const invalidCredentials = ()=> res.status(401).json({
    error:{
      code: 'INVALID_CREDENTIALS',
      message: 'Invalid email or password'
    }
  })

  try{
    const user = await prisma.user.findUnique({
      where: {email: email.trim().toLowerCase()},
      select: {
        id: true,
        name: true, 
        email: true,
        passwordHash: true
      }
    });
    if(!user) return invalidCredentials();
    
    const matches = await bcrypt.compare(password, user.passwordHash);
    if(!matches) return invalidCredentials();
    return res.status(200).json({
      id: user.id,
      name: user.name,
      emial: user.email
    })
  }catch(error){
    return next (error)
  }

  // return res.status(501).json({ error: { code: 'NOT_IMPLEMENTED', message: 'Implement login' } });
});

module.exports = router;
