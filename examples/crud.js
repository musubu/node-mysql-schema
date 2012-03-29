// Require module

var Schema = require('../lib/mysql-schema');

// You need mysql client instance.

var mysql = require('mysql')
  , client = mysql.createClient({
    database: 'node-mysql-schema-test'
    , user: 'username'
    , password: 'password'
  });

// utility function to generate unique token
function generateToken(callback) {
  var chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz";
  var string_length = 8;
  var randomString = '';
  for (var i=0; i<string_length; i++) {
    var rnum = Math.floor(Math.random() * chars.length);
    randomString += chars.substring(rnum,rnum+1);
  }
  callback(randomString);
}

/* ====================================================================
Define schema
==================================================================== */
var dbmodel = new Schema(client, 'articles', {
  id: {
    type: Number
  }
  , token: {
    type: String
  }
  , title: {
    type: String
    , validate: ["notEmpty()", "len(1, 200)"]
  }
  , content: {
    type: String
    , validate: ["notEmpty()"]
  }
  , draft: {
    type: Boolean
  }
  , created_at: {
    type: Date
    , default: new Date()
  }
  , updated_at: {
    type: Date
    , default: new Date()
  }
})

// now dbmodel is an instance of MySQLSchema

// override beforeCreate callback
dbmodel.beforeCreate = function(callback) {
  var self = this;

  generateToken(function(token) {
    self.set('token', token, function(err, dbmodel) {
      callback();
    })
  })
}

// override beforeUpdate callback
dbmodel.beforeUpdate = function(callback) {
  var self = this;
  self.set('updated_at', new Date(), function(err, dbmodel) {
    callback();
  })
}

/* ====================================================================
Create
==================================================================== */
dbmodel.create({
  title: 'First article'
  , content: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.'
}, function(err, article) {
  if (!err) {
    console.log(article);
  } else {
    console.log(err);
  }
})

// in this case, you'll get debug output as below.
// { id: 1,
//   token: 'aGve1cLV',
//   title: 'First article',
//   content: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
//   draft: 0,
//   created_at: Wed, 28 Mar 2012 08:32:34 GMT,
//   updated_at: Wed, 28 Mar 2012 08:32:34 GMT }

// create: build and save. style 1.

dbmodel.build({
  title: 'Build and save. style 1'
  , content: 'Build a MySQLSchema object and save.'
}, function(err, dbmodel) {
  if (!err) {
    // you'll get a MySQLSchema instance by build method
    // now you can save it with 'save' method.
    dbmodel.save(function(err, article) {
      if (!err) {
        console.log(article);
      } else {
        console.log(err);
      }
    })
  } else {
    console.log(err);
  }
})

// You will get debug output below.
// { id: 5,
//   token: 'RDT0E1c3',
//   title: 'Build and save. style 1',
//   content: 'Build a MySQLSchema object and save.',
//   draft: 0,
//   created_at: Wed, 28 Mar 2012 17:15:51 GMT,
//   updated_at: Wed, 28 Mar 2012 17:15:51 GMT }

// create: build and save. style 2.

var c2 = dbmodel.build({
  title: 'Build and save. style 2'
  , content: 'Build a MySQLSchema object and save.'
});

// build method without a callback returns a MySQLScheme object.
// so, you can save and get an json object like below.

c2.save(function(err, article) {
  if (!err) {
    console.log(article);
  } else {
    console.log(err);
  }
})

// You will get debug output below.
// { id: 8,
//   token: 'Fo6CTCdT',
//   title: 'Build and save. style 2',
//   content: 'Build a MySQLSchema object and save.',
//   draft: 0,
//   created_at: Wed, 28 Mar 2012 17:19:14 GMT,
//   updated_at: Wed, 28 Mar 2012 17:19:14 GMT }

/* ====================================================================
Query interfaces
==================================================================== */

// find

// function(where, fields, options, callback)

// MySQLSchema.find({where condition}, [fields], {options}, function(err, results) {});

// MySQLSchema.find({
//   // where
//   and: [
//     {
//       condition: '='
//       , field: 'id'
//       , value: 1
//     }
//     , {
//       condition: 'in'
//       , field: 'id'
//       , value: [1, 2, 3]
//     }
//   ]
//   , or: [
//     condition: '='
//     , field: 'title'
//     , value: 'My title'
//   ]
// }
// // fields
// , ['title', 'token', 'updated_at']
// // options
// , {
//   order: ['created_at', 'DESC']
//   , group: 'id'
//   , limit: 1
//   , offset: 10
// }, function(err, results) {
//   if (!err) {
//     // 'results' is an array of model objects 
//   } else {
//     
//   }
// })

dbmodel.find({
  and: [
    {
      condition: '='
      , field: 'id'
      , value: 1
    }
    , {
      condition: '='
      , field: 'title'
      , value: 'First article'
    }
  ]
  , or: [
    {
      condition: '='
      , field: 'id'
      , value: 2
    }
  ]
}
, ['id', 'title', 'content']
, {
  order: ['created_at', 'ASC']
}, function(err, articles) {
  if (!err) {
    console.log(articles);
  } else {
    console.log(err);
  }
})

// you will get an array of model objects as below.

// [ { id: 1,
//     title: 'First article',
//     content: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.' },
//   { id: 2,
//     title: 'First article',
//     content: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.' } ]

// find: shorthand
dbmodel.find({condition: '=', field: 'id', value: 1}, [], {}, function(err, articles) {
  if (!err) {
    console.log(articles);
  } else {
    console.log(err);
  }
})

// this will output below.
// [ { id: 1,
//     token: 'aGve1cLV',
//     title: 'First article',
//     content: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
//     draft: 0,
//     created_at: Wed, 28 Mar 2012 08:32:34 GMT,
//     updated_at: Wed, 28 Mar 2012 08:32:34 GMT } ]

// findOne
// MySQLSchema.findOne({where condition}, [fields], callback);

// long style.

dbmodel.findOne({
  and: [
    {
      condition: '='
      , field: 'id'
      , value: 1
    }
    , {
      condition: '='
      , field: 'title'
      , value: 'First article'
    }
  ]
}
, ['id', 'title'], function(err, article) {
  if (!err) {
    console.log(article);
  } else {
    console.log(err);
  }
})

// you will get a single model object as below.
// { id: 1, title: 'First article' }

// short style
dbmodel.findOne({condition: '=', field: 'id', value: 1}, ['id', 'title'], function(err, article) {
  if (!err) {
    console.log(article);
  } else {
    console.log(err);
  }
})

// you will get a single model object as below.
// { id: 1, title: 'First article' }


// Count
//MySQLSchema.count({where condition}, {options}, callback);

dbmodel.count({}, {}, function(err, count) {
  if (!err) {
    console.log(count);
    // in this case
    // 20
  } else {
    console.log(err);
  }
})

/* ====================================================================
Direct query
==================================================================== */

dbmodel.query('select * from articles order by created_at desc limit 1', function(err, articles) {
  if (!err) {
    console.log(articles);
  } else {
    console.log(err);
  }
})

// [ { id: 30,
//     token: 'bxyOW8oF',
//     title: 'First article',
//     content: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
//     draft: 0,
//     created_at: Wed, 28 Mar 2012 18:06:32 GMT,
//     updated_at: Wed, 28 Mar 2012 18:06:32 GMT } ]

dbmodel.query("insert into articles (token, title, content) values('abcdefg', 'inserted by direct query', 'sample content')", function(err, result) {
  if (!err) {
    console.log(result);
  } else {
    console.log(err);
  }
})

// this returns node-mysql's result.

// { affectedRows: 1,
//   insertId: 36,
//   serverStatus: 2,
//   warningCount: 0,
//   message: '',
//   setMaxListeners: [Function],
//   emit: [Function],
//   addListener: [Function],
//   on: [Function],
//   once: [Function],
//   removeListener: [Function],
//   removeAllListeners: [Function],
//   listeners: [Function] }

/* ====================================================================
Update
==================================================================== */

// MySQLScheme.update(obj, callback);

dbmodel.findOne({
  condition: '='
  , field: 'id'
  , value: 1
}, [], function(err, article) {
  if (!err) {
    article.title = 'updated';
    dbmodel.update(article, function(err, article) {
      if (!err) {
        console.log(article);
      } else {
        console.log(err);
      }
    })
  } else {
    console.log(err);
  }
})

// MySQLScheme.build(obj, callback) and then MySQLScheme.save(callback)
dbmodel.findOne({
  condition: '='
  , field: 'id'
  , value: 1
}, [], function(err, article) {
  if (!err) {
    article.title = 'updated again on ' + new Date();
    dbmodel.build(article, function(err, dbmodel) {
      if (!err) {
        dbmodel.save(function(err, article) {
          if (!err) {
            console.log(article);
          } else {
            console.log(err);
          }
        })
      } else {
        console.log(err);
      }
    })
  } else {
    console.log(err);
  }
})

/* ====================================================================
Destroy
==================================================================== */

dbmodel.create({
  title: 'To be destroyed.'
  , content: 'to be destroyed'
}, function(err, article) {
  if (!err) {
    console.log(article);
    dbmodel.build(article, function(err, dbmodel) {
      if (!err) {
        dbmodel.destroy(function(err, result) {
          if (!err) {
            console.log(result);
          } else {
            console.log(err);
          }
        })
      } else {
        console.log(err);
      }
    })
  } else {
    console.log(err);
  }
})

// this returns node-mysql result
// { affectedRows: 1,
//   insertId: 0,
//   serverStatus: 2,
//   warningCount: 0,
//   message: '',
//   setMaxListeners: [Function],
//   emit: [Function],
//   addListener: [Function],
//   on: [Function],
//   once: [Function],
//   removeListener: [Function],
//   removeAllListeners: [Function],
//   listeners: [Function] }

/* ====================================================================
Callback
==================================================================== */

// Object lifecycle is like below.

// creation

// - validate
// - beforeSave
// - beforeCreate
// - (save to db happen)
// - afterSave
// - afterCreate

// update

// - validate
// - beforeSave
// - beforeCreate
// - beforeUpdate
// - (save to db happen)
// - afterSave
// - afterUpdate

// destroy

// - beforeDestroy
// - (remove from db happen)
// - afterDestroy

// Callback example

// By default, each callback do NOTHING. You need to override
// callbacks if you would like to do something.

// // override beforeCreate callback
// dbmodel.beforeCreate = function(callback) {
//   var self = this;
// 
//   generateToken(function(token) {
//     self.set('token', token, function(err, dbmodel) {
//       callback();
//     })
//   })
// }
// 
// // override beforeUpdate callback
// dbmodel.beforeUpdate = function(callback) {
//   var self = this;
//   self.set('updated_at', new Date(), function(err, dbmodel) {
//     callback();
//   })
// }

/* ====================================================================
Validation
==================================================================== */

// Validation can be defined when instantiate new schema.
// All of validation methods from node-validator can be used.
// For node-validator's validation methods, please visit below

// https://github.com/chriso/node-validator

// is()                            //Alias for regex()
// not()                           //Alias for notRegex()
// isEmail()
// isUrl()                         //Accepts http, https, ftp
// isIP()
// isAlpha()
// isAlphanumeric()
// isNumeric()
// isInt()                         //isNumeric accepts zero padded numbers, e.g. '001', isInt doesn't
// isLowercase()
// isUppercase()
// isDecimal()
// isFloat()                       //Alias for isDecimal
// notNull()
// isNull()
// notEmpty()                      //i.e. not just whitespace
// equals(equals)
// contains(str)
// notContains(str)
// regex(pattern, modifiers)       //Usage: regex(/[a-z]/i) or regex('[a-z]','i')
// notRegex(pattern, modifiers)
// len(min, max)                   //max is optional
// isUUID(version)                 //Version can be 3 or 4 or empty, see http://en.wikipedia.org/wiki/Universally_unique_identifier
// isDate()                        //Uses Date.parse() - regex is probably a better choice
// isAfter(date)                   //Argument is optional and defaults to today
// isBefore(date)                  //Argument is optional and defaults to today
// isIn(options)                   //Accepts an array or string
// notIn(options)
// max(val)
// min(val)
// isArray()
// isCreditCard()                  //Will work against Visa, MasterCard, American Express, Discover, Diners

// Schema definition with validation example

// var dbmodel = new Schema(client, 'articles', {
//   id: {
//     type: Number
//   }
//   , token: {
//     type: String
//   }
//   , title: {
//     type: String
//     , validate: ["notEmpty()", "len(1, 200)"]
//   }
//   , content: {
//     type: String
//     , validate: ["notEmpty()"]
//   }
//   , draft: {
//     type: Boolean
//   }
//   , created_at: {
//     type: Date
//     , default: new Date()
//   }
//   , updated_at: {
//     type: Date
//     , default: new Date()
//   }
// })
