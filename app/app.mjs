import express from 'express'
import bodyParser from 'body-parser'
import  Redis from 'ioredis'
import { WebRobo8 } from './modules/web-robo8/index.js'
import { check, validationResult } from 'express-validator'
import winston from 'winston'
const { combine, timestamp, printf } = winston.format;
import rTracer from 'cls-rtracer'
import 'winston-daily-rotate-file';

const rTracerFormat = printf((info) => {
  const rid = rTracer.id()
  return `[${info.timestamp}] ${rid} ${info.level}: ${info.message}`
})

const logger = winston.createLogger({
  level: 'info',
  format: combine(
    timestamp({
      format: 'YYYY-MM-DD hh:mm:ss.SSS A',
    }),
    rTracerFormat
  ),
  transports: [
    new winston.transports.DailyRotateFile({ filename: './log/application-%DATE%.log', level: 'info' })
  ],
})

const app = express()
const redis = new Redis(
  {
    port: 6379, 
    host: 'redis'
  }
)
app.use(rTracer.expressMiddleware())

let webrobo8 = {}
const ROBO8_CASHE_HASH_KEY = 'robo8'
const ROBO8_CASHE_ID_KEY ='robo_id'
const ROBO8_FULL = 10
const STATUS_WAIT = 'wait'
const STATUS_ERROR = 'error'
const STATUS_DONE = 'done'

app.set('view engine', 'ejs')
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())


app.use((req, res, next) => 
{
  logger.info(`Received a ${req.method} request for ${req.url}`)
  if (Object.keys(req.body).length) 
  {
    logger.info(`${JSON.stringify(req.body)}`)
  }
  next();
});


let router = express.Router()
app.use('/', router)

router.get('/webrobo8', async (req, res) => 
{
  const prompts = await redis.hgetall(ROBO8_CASHE_HASH_KEY)
  
  if (Object.keys(prompts).length < 1) 
  {
    logger.info('webrobo8 not found')
    return res.status(404).json( { message: 'NG', data: [ { status: STATUS_ERROR, outputData: [{ text: 'webrobo8 not found', jsCode: '' }] } ] } )
  }

  const ret = Object.keys(prompts).map((v) => 
  {
    return JSON.parse(prompts[v])
  })

  res.json({
    message: 'OK',
    data: ret
  })
})

app.get('/webrobo8/:id', async (req, res) => 
{

  let output = await redis.hget(ROBO8_CASHE_HASH_KEY, req.params.id)
  output = JSON.parse(output)
  
  if (!output) 
  {
    logger.info('webrobo8 not found')
    return res.status(404).json( { message: 'NG', data: [ { status: STATUS_ERROR, outputData: [{ text: 'webrobo8 not found', jsCode: '' }] } ] } )
  }
    
  res.json({
    message: 'OK',
    data: [output]
  })
})


router.post('/webrobo8', async (req, res) => 
{
 
  await check('url')
          .notEmpty().withMessage('required url')
          .custom(v => URL.canParse(v)).withMessage('invalid url')
          .run(req)
  await check('prompts')
           .notEmpty().withMessage('required prompts')
           .run(req)
  await check("prompts.*.prompt")  
          .notEmpty().withMessage('required prompts.*.prompt')
          .run(req)

  const result = validationResult(req)
  if (!result.isEmpty()) 
  {
    logger.info(`validation error ${JSON.stringify(result.array())}`)
    return res.status(400).json({ errors: result.array() })
  }
  
  const robo8Length = await redis.hlen(ROBO8_CASHE_HASH_KEY)
  const isRobo8Full = (ROBO8_FULL < robo8Length) ? true : false
  if (isRobo8Full) 
  {
    logger.info('webrobo8 full')
    return res.status(429).json( { message: 'NG', data: [ { status: STATUS_ERROR, outputData: [{ text: 'webrobo8 full', jsCode: '' }] } ] } )
  }

  await redis.incr(ROBO8_CASHE_ID_KEY)
  let id = await redis.get(ROBO8_CASHE_ID_KEY)
  await redis.hset(ROBO8_CASHE_HASH_KEY, id, JSON.stringify( { id: id, status: STATUS_WAIT, outputData: [{ text: 'please wait', jsCode: '' }] } ))

  webrobo8[id] = new WebRobo8(
    {
      url: req.body.url,
      prompts: req.body.prompts,
      id: id
    }
  )

  webrobo8[id].output()
              .then(async (value) => 
              {
                
                let hasOutputData = await redis.hget(ROBO8_CASHE_HASH_KEY, value.id)
                if (!hasOutputData) 
                {
                  logger.info(`outputdata is empty ${value.id}`)
                  return
                }
                const outputData = { 
                  id: value.id,
                  status: STATUS_DONE,
                  outputData: value.data
                }
                logger.info(`succss ${JSON.stringify(outputData)}`)

                await redis.hset(ROBO8_CASHE_HASH_KEY, value.id, JSON.stringify(outputData))
              })
              .catch(async (value) => 
              {
                
                if (!value.errors) 
                {
                  logger.error(`error is empty`)
                  return
                }

                let hasOutputData = await redis.hget(ROBO8_CASHE_HASH_KEY, value.errors.id)
                if (!hasOutputData) 
                {
                  logger.error(`outputdata is empty ${value.errors.id}`)
                  return
                }

                const outputData = {
                  id: value.errors.id,
                  status: STATUS_ERROR,
                  outputData: [{ text: value.errors.message, jsCode: value.errors.jsCode }]
                }

                logger.info(`error ${JSON.stringify(outputData)}`)
                await redis.hset(ROBO8_CASHE_HASH_KEY, value.errors.id, JSON.stringify(outputData))
              })

  res.json(
    { 
      message: 'OK', 
      data: [{ id: id }]
    }
  )
})

app.delete('/webrobo8', async (req, res) => 
{
  let message = await redis.del(ROBO8_CASHE_HASH_KEY)
                        .then(() => 
                        {
                          return "OK"
                        })
                        .catch((error) => 
                        {
                          logger.info(`error ${JSON.stringify(error)}`)
                          return "NG"
                        })
  
  Object.keys(webrobo8).forEach(async (k) => 
  {
    if (webrobo8[k]) await webrobo8[k].close()
  })

  webrobo8 = {}

  if (message == "OK") 
  {
    await redis.set(ROBO8_CASHE_ID_KEY, 0)
  }
  
  res.json(
    { 
      message: message
    } 
  )
})

app.delete('/webrobo8/:id', async (req, res) => 
{
  let message = await redis.hdel(ROBO8_CASHE_HASH_KEY, req.params.id)
                        .then(() => 
                        {
                          return "OK"
                        })
                        .catch((error) => 
                        {
                          logger.info(`error ${JSON.stringify(error)}`)
                          return "NG"
                        })
  
  if (webrobo8[req.params.id]) {
    await webrobo8[req.params.id].close()
    delete webrobo8[req.params.id]
  }
          
  res.json(
    { 
      message: message
    } 
  )
})


app.get('/sample', (req, res) => 
{
  res.render("/var/www/app/views/index.ejs");
})

app.listen(3000, () => 
{
  console.log('Server listening on port 3000')
})
