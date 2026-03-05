//E:\pro\midigenerator_v2\backend\routes\alter.js
'use strict'
const { Router } = require('express')
const { alter }  = require('../controllers/alterController')
const router     = Router()
router.post('/', alter)
module.exports = router