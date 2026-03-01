//E:\pro\midigenerator_v2\backend\routes\knowledge.js


'use strict'

const { Router } = require('express')
const ctrl = require('../controllers/knowledgeController')

const router = Router()

router.get('/',                  ctrl.list)
router.delete('/all',            ctrl.removeAll)
router.delete('/by-name/:name',  ctrl.removeByName)   // primary — delete by filename
router.delete('/:id',            ctrl.remove)          // legacy — delete by row id

module.exports = router