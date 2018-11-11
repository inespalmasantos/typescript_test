const pgPromise = require('pg-promise');
const R         = require('ramda');
const request   = require('request-promise');

// Limit the amount of debugging of SQL expressions
const trimLogsSize : number = 200;

// Database interface
interface DBOptions
  { host      : string
  , database  : string
  , user?     : string
  , password? : string
  , port?     : number
  };

// Actual database options
const options : DBOptions = {
  user: 'XXXXX',
  password: 'XXXXX',
  host: 'localhost',
  database: 'lovelystay_test',
};

console.info('Connecting to the database:',
  `${options.user}@${options.host}:${options.port}/${options.database}`);

const pgpDefaultConfig = {
  promiseLib: require('bluebird'),
  // Log all querys
  query(query) {
    console.log('[SQL   ]', R.take(trimLogsSize,query.query));
  },
  // On error, please show me the SQL
  error(err, e) {
    if (e.query) {
      console.error('[SQL   ]', R.take(trimLogsSize,e.query),err);
    }
  }
};

interface GithubUsers
  { id : number
  };

const pgp = pgPromise(pgpDefaultConfig);
const db = pgp(options);

// Read command line arguments with user fields
const login = process.argv.slice(2)
const u_name = process.argv.slice(3)
const company = process.argv.slice(4)
const position = process.argv.slice(5)
const u_location = process.argv.slice(6)

db.result('SELECT * FROM information_schema.tables WHERE table_name = $1', ['github_users'])
  .then(result => {
    // Create table github_users if it does not exist
    if (result.rowCount != 1) {
      return db.none('CREATE TABLE github_users (id BIGSERIAL, login TEXT, name TEXT, company TEXT, position TEXT, location TEXT)')
    };
  })
  .then(() => {
    return db.result('SELECT * FROM github_users WHERE login = $1', [login[0]])
    .then((result) => {
      // Check if user exists
      if (result.rowCount == 1) {
        console.log('User already exists');
        process.exit(0);
      // Add new user if it does not exist
      } else {
        db.one('INSERT INTO github_users (login, name, company, position, location) VALUES ($1, $2, $3, $4, $5) RETURNING id', [login[0], u_name[0], company[0], position[0], u_location[0]])
        .then(({id}) => console.log(id))
        .then(() => process.exit(0));
      }
    });
  })
  

