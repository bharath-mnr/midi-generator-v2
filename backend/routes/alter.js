'use strict'
const { Router } = require('express')
const { alter }  = require('../controllers/alterController')
const router     = Router()
router.post('/', alter)
module.exports = router