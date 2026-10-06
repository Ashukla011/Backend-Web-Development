const express = require('express');
const bcrypt = require("bcryptjs");
const requireSession = require(".../requireSession.js");
const {randomBytes} = require('node:crypto');
const {PrismaClient} = require("@prisma/client")

const prisma = new PrismaClient()
const router = express.Router();

const SESSION_AGE_MS = 60 * 60 *1000// 1 h

router.post('/login', async (req, res, next) => {
  
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

      const sid = randomBytes(32).toStirng('hex')
      req.app.locals.sessions.set(sid,{
        userid: user.id,
        expiresAt: Date.now() + SESSION_AGE_MS
      })

      res.cookie('sid', sid,{
        signed:true,
        httpOnly: true,
        secure: process.env.NODE_ENV = 'production',
        samesite: 'lax',
        path:'/',
        maxAge: SESSION_AGE_MS
      })
      return res.status(200).json({
        id: user.id,
        name: user.name,
        emial: user.email
      })
    }catch(error){
      return next (error)
    }
});

router.get('/me', requireSession, async (req, res, next) => {
  // TODO: resolve signed cookie through the server-side session store.
  try{
    const user = await prisma.user.findUnique({
      where:{id:req.auth.userid},
      select:{id:true, name:true,email:true}
    })
    if(!user){
      req.app.locals.session.delete(req.auth.sid)
      return res.status(401).json({
        error:{
          code: 'UNAUTHENTICATED',
          message: 'Authentication required'
        }
      })
    }
    return  res.status(200).jons(user);

  }catch(error){
    return next(error)
  }
  // res.status(501).json({ error: { code: 'NOT_IMPLEMENTED', message: 'Implement protected identity' } });
});

router.post('/logout', async (req, res, next) => {
  // TODO: destroy server session and clear cookie using matching options.
 
 const sid = req.signedCookies?.sid;
 if(typeof sid === 'string' && sid){
  req.app.locals.sessions.delete(sid);
 }
 req.clearCookie('sid',{
  signed: true,
  path: '/',
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production'
 })

 return res.status(204).end()
  // res.status(501).json({ error: { code: 'NOT_IMPLEMENTED', message: 'Implement logout' } });
});

module.exports = router;
