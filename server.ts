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
const cmd_line_option = process.argv.slice(2)
const login = process.argv.slice(3)
const u_name = process.argv.slice(4)
const company = process.argv.slice(5)
const position = process.argv.slice(6)
const u_location = process.argv.slice(7)

// Add new user
if (cmd_line_option[0] == 'new_user') {
  // Check if new user information format is valid
  if (process.argv.length != 8) {
    console.log('New user information does not have a valid format.' + '\n' +
                'To add a new user enter the following user information: login, name, company, company position and location.' + '\n' +
                'Example: new_user jcristovao "Joao Cristóvão" "Lovely Stay" "CTO and Founder" Lisbon');
    process.exit(0);
  } else {
    // Check if table github_users exists / if not, create table
    db.result('SELECT * FROM information_schema.tables WHERE table_name = $1', ['github_users'])
    .then(result => {
      if (result.rowCount != 1) {
        return db.none('CREATE TABLE github_users (id BIGSERIAL, login TEXT, name TEXT, company TEXT, position TEXT, location TEXT)')
      };
    })
    // Check if user exists / if not, add user
    .then(() => {
      return db.result('SELECT * FROM github_users WHERE login = $1', [login[0]])
      .then((result) => {
        if (result.rowCount == 1) {
          console.log('User already exists.');
          process.exit(0);
        } else {
          db.one('INSERT INTO github_users (login, name, company, position, location) VALUES ($1, $2, $3, $4, $5) RETURNING id', [login[0], u_name[0], company[0], position[0], u_location[0]])
          .then(({id}) => console.log(id))
          .then(() => process.exit(0));
        }
      });
     })
    }
  
  
// List all the users registered in Lisbon
} else if (cmd_line_option[0] == 'users_lx'){
  // Check if table github_users exist / if yes, list users in Lisbon
  db.result('SELECT * FROM information_schema.tables WHERE table_name = $1', ['github_users'])
  .then(result => {
    if (result.rowCount != 1) {
      console.log('There are no github users registered.');
      process.exit(0);
    } else {
      db.result('SELECT * FROM github_users WHERE location = $1', ['Lisbon'])
      .then((result) => {
        if (result.rowCount < 1) {
          console.log('There are no github users registered in Lisbon.');
          process.exit(0);
        } else {
          console.log('Github users registered in Lisbon:' + '\n');
          for (let i = 0; i < result.rowCount; i++) {
            console.log('id: ' + result.rows[i].id + '\n' + 
                        'login: ' + result.rows[i].login + '\n' + 
                        'name: ' + result.rows[i].name + '\n' +
                        'company: ' + result.rows[i].company + '\n' + 
                        'position: ' + result.rows[i].position + '\n' + 
                        'location: ' + result.rows[i].location + '\n');
          }
          process.exit(0);
        }
      })
    }  
  })
  
// Show stats for how many users per location
} else if (cmd_line_option[0] == 'location_stats') {
  // Check if table github_users exist / if yes, show stats
  db.result('SELECT * FROM information_schema.tables WHERE table_name = $1', ['github_users'])
  .then(result => {
    if (result.rowCount != 1) {
      console.log('There are no github users registered.');
      process.exit(0);
    } else {
      const stats = {};
      db.result('SELECT DISTINCT location FROM github_users')
      .then(result => {
        for (let i = 0; i < result.rowCount; i++) {
          db.result('SELECT * FROM github_users WHERE location = $1', [result.rows[i].location])
            .then(data => {
              return stats[result.rows[i].location] = data.rowCount;
             })
            .then(() => {
              if (i == result.rowCount - 1) {
                console.log('Number of github users per location:');
                Object.keys(stats).forEach(key => {
                  console.log(key + ': ' + stats[key]);     
                });
                process.exit(0);
              }
            })
        }
      })
    }  
  })

// Command line options
} else {
  console.log('Enter a valid command. Command options are: new_user, users_lx or location_stats.' + '\n' +
    'To add a new user enter the following user information: login, name, company, company position and location.' + '\n' +
    'Examples of command options:' + '\n' + 
    '    new_user jcristovao "Joao Cristóvão" "Lovely Stay" "CTO and Founder" Lisbon' + '\n' +
    '    users_lx' + '\n' +
    '    location_stats');
  process.exit(0);
}
