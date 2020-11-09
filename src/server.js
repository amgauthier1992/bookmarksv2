const knex = require('knex')
const app = require('./app');
const { PORT, DB_URL } = require('./config');

const db = knex({
  client: 'pg',
  connection: DB_URL,
})

app.set('db', db) //we set a db property on the app object as to avoid a dependency
//cycle of requiring the server file in our app.js file. 

app.listen(PORT, () => {
  console.log(`Server listening at http://localhost:${PORT}`);
});
