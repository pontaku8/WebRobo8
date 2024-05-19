import express from 'express'
import bodyParser from 'body-parser'
import  Redis from 'ioredis'
import { WebRobo8 } from "./modules/web-robo8/index.js"
import  randomstring from "randomstring"
import { check, validationResult } from 'express-validator'

const app = express()
const redis =new Redis(
  {
    port: 6379, 
    host: 'redis'
  }
)

const PROMPT_CASHE_HASH_KEY = 'prompts'
const PROMPT_FULL = 10
const STATUS_WAIT = 'wait'
const STATUS_ERROR = 'error'
const STATUS_DONE = 'done'
const STATUS_SUCCESS = 'success'

app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())
let router = express.Router()
app.use('/', router)

router.get('/prompt', async (req, res) => 
{
  const prompts = await redis.hgetall(PROMPT_CASHE_HASH_KEY)
  
  if (Object.keys(prompts).length < 1) return res.status(404).json( { status: STATUS_SUCCESS, message: 'OK', data: [] } )

  const ret = Object.keys(prompts).map((v) => 
  {
    return JSON.parse(prompts[v])
  })

  res.json(ret)
})

app.get('/prompt/:promptCode', async (req, res) => 
{

  let output = await redis.hget(PROMPT_CASHE_HASH_KEY, req.params.promptCode)
  output = JSON.parse(output)
  
  if (!output) return res.status(404).json( { status: STATUS_ERROR, message: 'prompt not found', data: [] } )
  
  if (output.status != STATUS_WAIT) await redis.hdel(PROMPT_CASHE_HASH_KEY, req.params.promptCode)
  
  res.json(output)
})


router.post('/prompt', async (req, res) => 
{

  await check('url')
          .notEmpty().withMessage('required url')
          .custom(v => URL.canParse(v)).withMessage('invalid url')
          .run(req)
  await check('prompt')
          .notEmpty().withMessage('required prompt')
          .run(req)
  const result = validationResult(req)

  if (!result.isEmpty()) return res.status(400).json({ errors: result.array() })

  const promptCode = randomstring.generate(10)
  const prompt_length = await redis.hlen(PROMPT_CASHE_HASH_KEY)
  
  const is_prompt_full = (PROMPT_FULL < prompt_length) ? true : false
  
  if (is_prompt_full) return res.status(429).json( { status: STATUS_ERROR, message: 'prompt full', data: [] } )

  await redis.hset(PROMPT_CASHE_HASH_KEY, promptCode, JSON.stringify( { status: STATUS_WAIT, message: 'please wait', data: [] } ))

  new WebRobo8(
    {
      url: req.body.url,
      prompt: req.body.prompt,
      promptCode: promptCode
    }
  )
  .output()
  .then(async (value) => 
  {
    console.log('succss')
    await redis.hset(PROMPT_CASHE_HASH_KEY, value.promptCode, JSON.stringify(
      { 
        promptCode: value.promptCode,
        status: STATUS_DONE,
        data: [{ text: value.text, jsCode: value.jsCode }],
        message: 'OK',
      }
    ))
  })
  .catch(async (value) => 
  {
    console.log('error')
    await redis.hset(PROMPT_CASHE_HASH_KEY, value.errors.promptCode, JSON.stringify(
      { 
        promptCode: value.errors.promptCode,
        status: STATUS_ERROR,
        message: value.errors.message,
        data: [{ text: '', jsCode: value.errors.jsCode }]
      }
    ))
  })

  res.json(
    { 
      status: STATUS_SUCCESS, 
      message: 'OK', 
      data: [{ promptCode: promptCode }]
    }
  )
})

app.delete('/prompt', async (req, res) => 
{
  await redis.del(PROMPT_CASHE_HASH_KEY)
  res.json(
    { 
      status: STATUS_SUCCESS, 
      message: 'OK'
    } 
  )
})

app.get('/sample', (req, res) => 
{
  res.send(`
  <html>
  <body>
    <a class="test">こちら</a>
    <div>
      <span>名前</span>
      <input type="text" class="test-name" id="sample" name="sample" />
    </div>
    <div>
      <span>電話番号</span>
      <input type="text" class="test-tel" id="sample" name="sample" />
    </div>
    <span class="test1"></span>
    <span class="test2"></span>
  </body>
  <script>
    document.querySelectorAll(".test")[0].addEventListener('click', function(){ 
      document.querySelectorAll(".test1")[0].innerText = document.querySelectorAll(".test-name")[0].value;
      document.querySelectorAll(".test2")[0].innerText = document.querySelectorAll(".test-tel")[0].value;
    });
  </script>

</html>
  `)
});



app.listen(3000, () => 
{
  console.log('Server listening on port 3000')
});
