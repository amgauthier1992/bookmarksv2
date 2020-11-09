require('dotenv').config()
const { expect } = require('chai');
const knex = require('knex');
const supertest = require('supertest');
const app = require('../src/app');
const { makeBookmarksArray, makeMaliciousBookmark } = require('./bookmarks.fixtures') 

describe(`Bookmarks Endpoints`, function() {
  let db;

  before('make knex instance', () => {
    db = knex({
      client: 'pg',
      connection: process.env.TEST_DB_URL,
    })
    app.set('db', db) 
  })
  
  after('disconnect from db', () => db.destroy())
  
  before('clean the table', () => db('bookmarks').truncate())
  
  afterEach('cleanup', () => db('bookmarks').truncate())
  
  describe(`GET /api/bookmarks`, () => {
    context(`Given no bookmarks`, () => {
      it(`responds with 200 and an empty array` , () => {
        return supertest(app)
          .get('/api/bookmarks')
          .set('Authorization', 'Bearer ' + process.env.API_TOKEN)
          .expect(200, [])
      })
    })
    context(`Given there are bookmarks in the database` , () => {
      const testBookmarks = makeBookmarksArray();

      beforeEach('insert bookmarks', () => {
        return db
          .into('bookmarks')
          .insert(testBookmarks)
      })

      it('responds with 200 and all of the bookmarks', () => {
        return supertest(app)
          .get('/api/bookmarks')
          .set('Authorization', 'Bearer ' + process.env.API_TOKEN)
          .expect(200, testBookmarks)
      })
    })

    context(`Given an XSS attack bookmark`, () => {
      const { maliciousBookmark, expectedBookmark } = makeMaliciousBookmark()

      beforeEach('insert malicious bookmark', () => {
        return db
          .into('bookmarks')
          .insert([ maliciousBookmark ])
      })

      it('removes XSS attack content', () => {
        return supertest(app)
          .get(`/api/bookmarks`)
          .set('Authorization', 'Bearer ' + process.env.API_TOKEN)
          .expect(200)
          .expect(res => {
            expect(res.body[0].title).to.eql(expectedBookmark.title)
            expect(res.body[0].url).to.eql(expectedBookmark.url)
            expect(res.body[0].description).to.eql(expectedBookmark.description)
            expect(res.body[0].rating).to.eql(expectedBookmark.rating)
          })
      })
    })
  })

  describe(`GET /api/bookmarks/:bookmark_id`, () => {
    context(`Given there are no bookmarks`, () => {
      const bookmarkId = 123456
      return supertest(app)
        .get(`/api/bookmarks/${bookmarkId}`)
        .set('Authorization', 'Bearer ' + process.env.API_TOKEN)
        .expect(404, { error: { message: `Bookmark doesn't exist` } })
    })
    context('Given there are bookmarks in the database', () => {
      const testBookmarks = makeBookmarksArray();

      beforeEach('insert bookmarks', () => {
        return db
          .into('bookmarks')
          .insert(testBookmarks)
      })

      it('responds with 200 and the specified bookmark', () => {
        const bookmarkId = 2  //selecting a random bookmark id to use for the expectedBookmark variable below
        const expectedBookmark = testBookmarks[bookmarkId - 1]  //testBookmarks[1]
          return supertest(app) //when 
            .get(`/api/bookmarks/${bookmarkId}`)
            .set('Authorization', 'Bearer ' + process.env.API_TOKEN)
            .expect(200, expectedBookmark) 
      })
    })
    context(`Given an XSS attack bookmark`, () => {
      const { maliciousBookmark, expectedBookmark } = makeMaliciousBookmark()

      beforeEach('insert malicious bookmark', () => {
        return db
          .into('bookmarks')
          .insert([ maliciousBookmark ])
      })

      it('removes XSS attack content', () => {
        return supertest(app)
          .get(`/api/bookmarks/${maliciousBookmark.id}`)
          .set('Authorization', 'Bearer ' + process.env.API_TOKEN)
          .expect(200)
          // console.log(res.body[0].title)
          .expect(res => {
            expect(res.body[0].title).to.eql(expectedBookmark.title)
            expect(res.body[0].url).to.eql(expectedBookmark.url)
            expect(res.body[0].description).to.eql(expectedBookmark.description)
            expect(res.body[0].rating).to.eql(expectedBookmark.rating)
          })
      })
    })
  })

  describe(`POST /api/bookmarks`, () => {
    //validating that our .post res body and .get res body match
    it(`creates a bookmark, responding with 201 and the new bookmark`, () => {
      const newBookmark = {
        title: 'Test new bookmark',
        url: 'https://www.newTestBookmark.com',
        description: 'Test new bookmark description',
        rating: 5
      }
      //first we do the post
      return supertest(app) //doesnt get returned until line 104
        .post('/api/bookmarks')
        .set('Authorization', 'Bearer ' + process.env.API_TOKEN)
        .send(newBookmark)
        .expect(201)
        .expect(res => {
          expect(res.body.title).to.eql(newBookmark.title)
          expect(res.body.url).to.eql(newBookmark.url)
          expect(res.body.description).to.eql(newBookmark.description)
          expect(res.body.rating).to.eql(newBookmark.rating)
          expect(res.body).to.have.property('id')
          expect(res.headers.location).to.eql(`/api/bookmarks/${res.body.id}`)
        })
        //then we do getById to see if it's there. 1st supertest generates the actual postRes for us to use in the .then
        .then(postRes => //using an implicit return so mocha knows to wait for both requests to resolve. When you only have 1 instruction for an arrow function(supertest(app)). postRes is just the parameter of the callback
          supertest(app) 
            .get(`/api/bookmarks/${postRes.body.id}`)
            .set('Authorization', 'Bearer ' + process.env.API_TOKEN)
            .expect(postRes.body)
        ) //so we go from line 89 down to 103. When we hit the .then, we go back up to 89 and get our postRes. .Then we return our postRes.body
    })
    it(`responds with 400 and an error message when the 'title' is missing`, () => {
      return supertest(app)
        .post('/api/bookmarks')
        .set('Authorization', 'Bearer ' + process.env.API_TOKEN)
        .send({
          url: 'https://www.newTestBookmark.com',
          description: 'Test new bookmark description',
          rating: 5
        })
        .expect(400, {
          error: { message: `Missing 'title' in request body` }
        })
    })
    it(`responds with 400 and an error message when the 'url' is invalid`, () => {
      return supertest(app)
        .post('/api/bookmarks')
        .set('Authorization', 'Bearer ' + process.env.API_TOKEN)
        .send({
          title: 'Test new bookmark',
          description: 'Test new bookmark description',
          rating: 5
        })
        .expect(400, {
          error: { message: `'url' must be a valid URL` }
        })
    })
    it(`responds with 400 and an error message when the 'description' is missing`, () => {
      return supertest(app)
        .post('/api/bookmarks')
        .set('Authorization', 'Bearer ' + process.env.API_TOKEN)
        .send({
          title: 'Test new bookmark',
          url: 'https://www.newTestBookmark.com',
          rating: 5
        })
        .expect(400, {
          error: { message: `Missing 'description' in request body` }
        })
    })
    it(`responds with 400 and an error message when the 'rating' is invalid`, () => {
      return supertest(app)
        .post('/api/bookmarks')
        .set('Authorization', 'Bearer ' + process.env.API_TOKEN)
        .send({
          title: 'Test new bookmark',
          url: 'https://www.newTestBookmark.com',
          description: 'Test new bookmark description',
        })
        .expect(400, {
          error: { message: `'rating' must be a number between 1 and 5` }
        })
    })
    it('removes XSS attack content from response', () => {
      const { maliciousBookmark, expectedBookmark } = makeMaliciousBookmark()
      return supertest(app)
        .post(`/api/bookmarks`)
        .set('Authorization', 'Bearer ' + process.env.API_TOKEN)
        .send(maliciousBookmark)
        .expect(201)
        .expect(res => {
          expect(res.body.title).to.eql(expectedBookmark.title)
          expect(res.body.url).to.eql(expectedBookmark.url)
          expect(res.body.description).to.eql(expectedBookmark.description)
          expect(res.body.rating).to.eql(expectedBookmark.rating)
        })
    })
  })

  describe(`DELETE /api/bookmarks/:bookmark_id`, () => {
    context('Given there are bookmarks in the database', () => {
      const testBookmarks = makeBookmarksArray()

      beforeEach('insert bookmarks', () => {
        return db
          .into('bookmarks')
          .insert(testBookmarks)
      })

      it(`responds with 204 and deletes the bookmark with the corresponding id`, () => {
        const bookmarkId = 2
        const expectedBookmarks = testBookmarks.filter(bookmark => bookmark.id !== bookmarkId)
        return supertest(app)
          .delete(`/api/bookmarks/${bookmarkId}`)
          .set('Authorization', 'Bearer ' + process.env.API_TOKEN)
          .expect(204)
          .then(res => 
            supertest(app)
              .get(`/api/bookmarks`)
              .set('Authorization', 'Bearer ' + process.env.API_TOKEN)
              .expect(expectedBookmarks)
          )
      })
    })
    context('Given there are no bookmarks in the database', () => {
      it(`responds with 404`, () => { 
        const bookmarkId = 123456
        return supertest(app)
          .delete(`/api/bookmarks/${bookmarkId}`)
          .set('Authorization', 'Bearer ' + process.env.API_TOKEN)
          .expect(404, { error: { message: `Bookmark doesn't exist` } })
      })
    })
  })

  describe(`PATCH /api/bookmarks/:bookmark_id`, () => {
    context(`Given no bookmarks`, () => {
      it(`responds with 404`, () => {
        const bookmarkId = 123456
        return supertest(app)
          .patch(`/api/bookmarks/${bookmarkId}`)
          .set('Authorization', 'Bearer ' + process.env.API_TOKEN)
          .expect(404, { error: { message: `Bookmark Not Found` } })
      })
    })
    context(`Given there are bookmarks in the database`, () => {
      const testBookmarks = makeBookmarksArray()

      beforeEach('insert bookmarks', () => {
        return db
          .into('bookmarks')
          .insert(testBookmarks)
      })

      it(`responds with 204 and updates the bookmark`, () => {
        const idToUpdate = 2
        const updatedBookmark = {
          title: 'updated bookmark title',
          url: 'https://www.updatedbookmark.com',
          description: 'updated description',
          rating: 5
        }
        const expectedBookmark = {
          ...testBookmarks[idToUpdate - 1],
          ...updatedBookmark
        }
        return supertest(app)
          .patch(`/api/bookmarks/${idToUpdate}`)
          .set('Authorization', 'Bearer ' + process.env.API_TOKEN)
          .send(updatedBookmark)
          .expect(204)
          .then(res => 
            supertest(app)
              .get(`/api/bookmarks/${idToUpdate}`)
              .set('Authorization', 'Bearer ' + process.env.API_TOKEN)
              .expect(expectedBookmark)
          )
      })

      it(`responds with 400 when no required fields supplied`, () => {
        const idToUpdate = 2
        return supertest(app)
          .patch(`/api/bookmarks/${idToUpdate}`)
          .set('Authorization', 'Bearer ' + process.env.API_TOKEN)
          .send({ irrelevantField: 'foo' })
          .expect(400, {
            error: {
              message: `Request body must contain either 'title', 'url', 'description, or 'rating'`
            }
          })
      })
    })
  })
})