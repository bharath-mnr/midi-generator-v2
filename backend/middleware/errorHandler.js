//E:\pro\midigenerator_v2\backend\middleware\errorHandler.js

'use strict'

// eslint-disable-next-line no-unused-vars
module.exports = function errorHandler(err, req, res, next) {
  console.error('[ERROR]', err.message)
  if (process.env.NODE_ENV !== 'production') {
    console.error(err.stack)
  }

  const status  = err.status || err.statusCode || 500
  const message = err.message || 'Internal server error'

  res.status(status).json({ error: message })
}
