const express = require('express')
const { isWebUri } = require('valid-url')
const xss = require('xss')
const logger = require('../logger')
const BookmarksService = require('./bookmarks-service')

const bookmarksRouter = express.Router()
const bodyParser = express.json() 

const serializeBookmark = bookmark => ({
  id: bookmark.id,
  title: xss(bookmark.title),
  url: xss(bookmark.url),
  description: xss(bookmark.description),
  rating: parseInt(xss(bookmark.rating)),
})
  
bookmarksRouter
  .route('/api/bookmarks')
  .get((req,res, next) => {
    const knexInstance = req.app.get('db')
    BookmarksService.getAllBookmarks(knexInstance)
      .then(bookmarks => {
        res.json(bookmarks.map(serializeBookmark))
      })
      .catch(next) 
  })
  .post(bodyParser, (req, res, next) => {
    const {title, url, description, rating} = req.body
    const ratingNum = Number(rating)
    const newBookmark = { title, url, description, rating }
    const knexInstance = req.app.get('db')

    if (!title) {
      return res.status(400).json({ 
        error: { message: `Missing 'title' in request body` }
      })
    }

    if (!isWebUri(url)) {
      logger.error(`Invalid url '${url}' supplied`)
      return res.status(400).send({
        error: { message: `'url' must be a valid URL` }
      })
    }
  
    if (!description) {
      return res.status(400).json({ 
        error: { message: `Missing 'description' in request body` }
      })
    }

    if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      logger.error(`Invalid rating '${rating}' supplied`)
      return res.status(400).send({
        error: { message: `'rating' must be a number between 1 and 5` }
      })
    }

    BookmarksService.insertBookmark(knexInstance, newBookmark)
      .then(bookmark => {
        res
          .status(201)
          .location(`/api/bookmarks/${bookmark.id}`) //sending back the location of the endpoint of the bookmark we just created
          // .location(req.originalUrl + `/${article.id}`)
          .json(serializeBookmark(bookmark))
      })
      .catch(next)
  })

  //combines all the if statements above
    // for (const [key, value] of Object.entries(newArticle)) {
    //   if (value == null) {
    //     return res.status(400).json({
    //       error: { message: `Missing '${key}' in request body` }
    //     })
    //   }
    // }

bookmarksRouter
  .route('/api/bookmarks/:bookmark_id')
  .get((req, res, next) => {
    const { bookmark_id } = req.params
    const knexInstance = req.app.get('db')
    BookmarksService.getById(knexInstance, bookmark_id)
      .then(bookmark => {
        if (!bookmark) {
          logger.error(`Bookmark with id ${bookmark_id} not found.`)
          return res.status(404).json({
            error: { message: `Bookmark doesn't exist` }
          })
        }
        res.json(serializeBookmark(bookmark))
      })
      .catch(next)
  })
  .delete((req, res, next) => {
    const { bookmark_id } = req.params
    const knexInstance = req.app.get('db')
    BookmarksService.deleteBookmark(knexInstance, bookmark_id)
      .then(bookmark => {
        if(!bookmark) {
          logger.error(`Bookmark with id ${bookmark_id} not found.`)
          return res.status(404).json({
            error: { message: `Bookmark doesn't exist` }
          })
        }
      return res.status(204).end() //204 doesnt let us send json response. We dont need to for delete request like post
      })
      .catch(next)
  })
  .patch(bodyParser, (req, res, next) => {
    const { title, url, description, rating } = req.body
    const bookmarkToUpdate = { title, url, description, rating }
    const knexInstance = req.app.get('db')
    const { bookmark_id } = req.params

    const numberOfValues = Object.values(bookmarkToUpdate).filter(Boolean).length
    if (numberOfValues === 0) {
      return res.status(404).json({
        error: {
          message: `Request body must contain either 'title', 'url', 'description, or 'rating'`
        }
      })
    }

    BookmarksService.updateBookmark(knexInstance, bookmark_id, bookmarkToUpdate)
      .then(numRowsAffected => {
        res.status(204).end()
      })
      .catch(next)
  })

module.exports = bookmarksRouter