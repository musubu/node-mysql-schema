var MySQLSchema = function(client, table, rawSchema) {
  this.table = table;
  this.client = client;
  this.rawSchema = rawSchema;
  this.model = null;
  this.validator = require('validator');
  this.check = this.validator.check;
  this.sanitize = this.validator.sanitize;
  
  this.errors = {};
  this.errors[this.table] = {};
  this.errors[this.table].error = null;
  this.errors[this.table].validationErrors = {}
  
  this.init();
}

MySQLSchema.prototype.init = function() {
  var self = this
    , model = {};
  
  Object.keys(this.rawSchema).forEach(function(key) {
    model[key] = null;
    Object.keys(self.rawSchema[key]).forEach(function(ak) {
      switch (ak) {
        case 'type':
          model[key] = new self.rawSchema[key][ak]().valueOf();
          break;
        case 'default':
          model[key] = self.rawSchema[key][ak];
          break;
      }
    })
  })
  
  this.model = model;
}

MySQLSchema.prototype.getJSON = function(callback) {
  var self = this;
  
  if (callback && (typeof callback == 'function')) {
    callback(self.model);
  } else {
    return self.model;
  }
}

MySQLSchema.prototype.set = function(key, value, callback) {
  var self = this;

  if (this.model.hasOwnProperty(key)) {
    self.model[key] = value;
    if (callback && (typeof callback == 'function')) {
      callback(null, self);
    } else {
      return self;
    }
  } else {
    if (callback && (typeof callback == 'function')) {
      callback(self.errors[self.table].error = "No such attribute: " + key, null);
    } else {
      throw 'No such attribute.';
    }
  }
}

MySQLSchema.prototype.get = function(key, callback) {
  var self = this;
  
  if (this.model.hasOwnProperty(key)) {
    if (callback && (typeof callback == 'function')) {
      callback(null, model[key]);
    } else {
      return model[key];
    }
  } else {
    if (callback && (typeof callback == 'function')) {
      callback(self.errors[self.table].error = "No such attribute: " + key, null);
    } else {
      throw 'No such attribute.';
    }
  }
}

MySQLSchema.prototype.new = function(callback) {
  var self = this;
  try {
    this.init();
    
    if (callback && (typeof callback == 'function')) {
      callback(null, self);
    } else {
      return self;
    }
  } catch (err) {
    if (callback && (typeof callback == 'function')) {
      callback(err, null);
    } else {
      throw err;
    }
  }
}

MySQLSchema.prototype.build = function(params, callback) {
  var self = this;
  try {
    Object.keys(params).forEach(function(k) {
      if (self.model.hasOwnProperty(k)) {
        self.model[k] = params[k];
      }
    })
    
    if (callback && (typeof callback == 'function')) {
      callback(null, self);
    } else {
      return self;
    }
  } catch (err) {
    if (callback && (typeof callback == 'function')) {
      callback(err, null);
    } else {
      throw "Error while building dbmodel.";
    }
  }
}

MySQLSchema.prototype.validate = function(mainCallback, callback) {
  var self = this;

  function validationCount (fn) {
    var count = 0;
    Object.keys(self.rawSchema).forEach(function(k) {
      if (self.rawSchema[k].hasOwnProperty('validate')) {
        count += 1;
      }
    });
    fn(count);
  }
  
  function doValidate (fn) {
    Object.keys(self.rawSchema).forEach(function(k) {
      if (self.rawSchema[k].hasOwnProperty('validate')) {
        for (var i=0; i < self.rawSchema[k].validate.length; i++) {
          if (typeof self.rawSchema[k].validate[i] == 'function') {
            // TODO: enable custom validation
          } else {
            try {
              var c = "self.check(self.model[k])." + self.rawSchema[k].validate[i];
              eval(c);
            } catch (e) {
              self.errors[self.table].error = 'Validation error.';
              self.errors[self.table].validationErrors[k] = e.message;
            }
          }
        };
      }
    })
    
    fn();
  }
  
  validationCount(function(count) {
    if (count > 0) {
      doValidate(function() {
        if (Object.keys(self.errors[self.table].validationErrors).length > 0) {
          mainCallback(self.errors, null);
        } else {
          callback();
        }
      })
    } else {
      callback();
    }
  })
}

MySQLSchema.prototype.save = function(callback) {
  var self = this;
  
  self.getJSON(function(o) {
    if (o.id > 0) {
      self.update(o, callback);
    } else {
      self.create(o, callback);
    }
  })
}

MySQLSchema.prototype.create = function(json, callback) {
  var self = this;
  
  self.build(json, function(err, dbmodel) {
    if (!err) {
      self.validate(callback, function() {
        self.beforeSave(function() {
          self.beforeCreate(function() {
            var attributes = []
              , values = []
              , query = "insert into " + self.table + " set ";

            for (k in self.model) {
              if (k != 'id') {
                attributes.push(k + " = ?");
                values.push(self.model[k]);
              }
            }

            query += attributes.join(', ');

            self.client.query(query, values, function(err, result) {
              if (!err) {
                self.client.query('select * from ' + self.table + " where id = ? limit 1", [result.insertId], function(err, r) {
                  self.model = r[0];
                  callback(err, self.getJSON());

                  self.afterSave(function() {
                    self.afterCreate(function() {

                    })
                  })
                })
              } else {
                callback(self.errors[self.table].error = err, null);
              }
            })
          })
        })
      })
    } else {
      callback(err, null);
    }
  })
}

MySQLSchema.prototype.update = function(json, callback) {
  var self = this;
  
  self.build(json, function(err, dbmodel) {
    if (!err) {
      self.validate(callback, function() {
        self.beforeSave(function() {
          self.beforeUpdate(function() {
            var attributes = []
              , values = []
              , query = "update " + self.table + " set ";
            
            for (k in json) {
              if (k != 'id') {
                attributes.push(k + " = ?");
                values.push(self.model[k]);
              }
            }
            
            query += attributes.join(", ");
            query += " where id = " + json.id;

            self.client.query(query, values, function(err, result) {
              if (!err) {
                callback(err, self.getJSON());
                
                self.afterSave(function() {
                  self.afterUpdate(function() {
                    
                  })
                })
              } else {
                callback(self.errors[self.table].error = err, null);
              }
            })            
          })
        })
      })
    } else {
      callback(err, null);
    }
  })
}

MySQLSchema.prototype.destroy = function(callback) {
  var self = this;
  
  this.beforeDestroy(function() {
    var query = "delete from " + self.table + " where id = ?";
    self.client.query(query, [self.model.id], function(err, result) {
      if (!err) {
        self.afterDestroy(function() {
          callback(err, result);
        })
      } else {
        callback(self.errors[self.table].error = err, null);
      }
    })
  })
}

MySQLSchema.prototype.query = function(query, callback) {
  var self = this;
  self.client.query(query, function(err, result) {
    callback(err, result);
  })
}

MySQLSchema.prototype.find = function(where, fields, options, callback) {
  var self = this;

  self.parseQueryWhere(where, function(err, rWhere) {
    if (!err) {
      self.parseQueryFields(fields, function(err, rFields) {
        if (!err) {
          self.parseQueryOptions(options, function(err, rOptions) {
            if (!err) {
              var query = 'select ' + rFields + " from " + self.table;
              
              if (rWhere.where) {
                query += " " + rWhere.where;
              }
              
              if (rOptions.length) {
                query += " " + rOptions;
              }
              
              self.client.query(query, rWhere.values, function(err, results) {
                callback(err, results);
              })
            } else {
              callback(err, null);
            }
          })
        } else {
          callback(err, null);
        }
      })
    } else {
      callback(err, null);
    }
  })
}

MySQLSchema.prototype.findOne = function(where, fields, callback) {
  var self = this;
  
  self.parseQueryWhere(where, function(err, rWhere) {
    if (!err) {
      self.parseQueryFields(fields, function(err, rFields) {
        if (!err) {
          var query = 'select ' + rFields + ' from ' + self.table;
          if (rWhere.where) {
            query += " " + rWhere.where;
          }
          query += " limit 1";
          
          self.client.query(query, rWhere.values, function(err, result) {
            callback(err, result[0]);
          })
        } else {
          callback(err, null);
        }
      })
    } else {
      callback(err, null);
    }
  })
}

MySQLSchema.prototype.count = function(where, options, callback) {
  var self = this;
  
  self.parseQueryWhere(where, function(err, rWhere) {
    if (!err) {
      self.parseQueryOptions(options, function(err, rOptions) {
        if (!err) {
          var query = 'select count(*) as count from ' + self.table;
          
          if (rWhere.where) {
            query += " " + rWhere.where;
          }
          
          if (rOptions.length) {
            query += " " + rOptions;
          }
          
          self.client.query(query, rWhere.values, function(err, result) {
            callback(err, result[0].count);
          })
        } else {
          callback(err, null);
        }
      })
    } else {
      callback(err, null);
    }
  })
}

MySQLSchema.prototype.parseQueryWhere = function (where, callback) {
  var self = this;
  
  try {
    var conditions = []
      , values = []
      , queryStrings = []
      , queryString = '';

    function processUnit (unit, fn) {
      switch (unit.condition) {
        case ('='):
          if (unit.value === null || unit.value == "NULL") {
            conditions.push(unit.field + " IS ?");
            values.push("NULL");
          } else {
            conditions.push(unit.field + " = ?")
            values.push(unit.value);
          }
          break;
        case ('in'):
          unit.value.map(function(v) {
            return self.client.escape(v);
          })

          conditions.push(unit.field + ' IN ("' + unit.value.join('", "') + '")')
          break;
      }

      if (fn && (typeof fn == 'function')) fn();
    }

    function processQuery (connector, fn) {
      where[connector].forEach(function(unit) {
        processUnit(unit);
      })
      
      queryStrings.push(conditions.join(" AND "));
      conditions = [];

      if (fn && (typeof fn == 'function')) fn();
    }

    switch (Object.keys(where).length) {
      case 0:
        // do nothing. to generate undefined queryString
        break;
      case 3:
        processUnit(where, function() {
          queryStrings.push(conditions[0]);
        })
        break;
      default:
        Object.keys(where).forEach(function(connector) {
          switch (connector) {
            case 'and':
              processQuery(connector);
              break;
            case 'or':
              processQuery(connector);
              break;
            // TODO: throw exception if connector is not in ['and', 'or']
          }
        })
        break;
    }
    
    if (queryStrings.length > 1) {
      queryString = queryStrings.join(" OR ");
    } else {
      queryString = queryStrings[0];
    }
    
    if (queryString) {
      queryString = "where " + queryString
    }
    
    callback(null, {
      where: queryString
      , values: values
    })
    
  } catch (err) {
    callback("Error while parsing query where.", null);
  }
}

MySQLSchema.prototype.parseQueryFields = function(fields, callback) {
  try {
    var results = '';
    
    if (fields.length) {
      results += fields.join(', ');
    } else {
      results += '*';
    }
    
    callback(null, results);
  } catch (err) {
    callback('Error while parsing query fields.', null);
  }
}

MySQLSchema.prototype.parseQueryOptions = function(options, callback) {
  try {
    var optionsArray = []
      , results = '';
    
    if (Object.keys(options).length) {
      Object.keys(options).forEach(function(key) {
        var option = options[key];
        
        switch (key) {
          case 'order':
            if ((option instanceof Array) && (option.length == 2) && (['asc', 'desc'].indexOf(option[1].toLowerCase()) >=0)) {
              optionsArray.push("order by " + option.join(' '));
            } else {
              throw 'order is not an instance of array.';
            }
            break;
          case 'group':
            optionsArray.push('group by ' + option);
            break;
          case 'limit':
            optionsArray.push('limit ' + option);
            break;
          case 'offset':
            optionsArray.push('offset ' + option);
            break;
        }
      })
    }
    
    results += optionsArray.join(' ');
    
    callback(null, results);
  } catch (err) {
    callback('Error while parsing query options.', null);
  }
}

MySQLSchema.prototype.beforeSave = function(callback) {
  callback();
}

MySQLSchema.prototype.afterSave = function(callback) {
  callback();
}

MySQLSchema.prototype.beforeCreate = function(callback) {
  callback();
}

MySQLSchema.prototype.afterCreate = function(callback) {
  callback();
}

MySQLSchema.prototype.beforeUpdate = function(callback) {
  callback();
}

MySQLSchema.prototype.afterUpdate = function(callback) {
  callback();
}

MySQLSchema.prototype.beforeDestroy = function(callback) {
  callback();
}

MySQLSchema.prototype.afterDestroy = function(callback) {
  callback();
}

exports = module.exports = MySQLSchema;