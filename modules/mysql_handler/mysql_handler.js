/*
**************************
@author Park, ChunSeong
@created 2014-03-24
This Document is protected
**************************
*/
var mysql = require('mysql');
var dbconn;
var read = require('read');

var setting = require('../../settings');

var db_template = {

}
function replaceClientOnDisconnect(client) {
  client.on("error", function (err) {
    if (!err.fatal) {
      console.log('20',err)
      return;
    }
 
    if (err.code !== "PROTOCOL_CONNECTION_LOST") {
      throw err;
    }
 
    // client.config is actually a ConnectionConfig instance, not the original
    // configuration. For most situations this is fine, but if you are doing 
    // something more advanced with your connection configuration, then 
    // you should check carefully as to whether this is actually going to do
    // what you think it should do.
    dbconn = mysql.createConnection(client.config);
    replaceClientOnDisconnect(dbconn);
    connection.connect(function (error) {
      if (error) {
        console.log('37',error)
        // Well, we tried. The database has probably fallen over.
        // That's fairly fatal for most applications, so we might as
        // call it a day and go home.
        process.exit(1);
      }
    });
  });
}
 
 
// And run this on every connection as soon as it is created.
/*

function db_conn_start(db_config){
  //dbconn = null;
  dbconn = mysql.createConnection(db_config); // Recreate the connection, since
  dbconn.connect(function(err) {              // The server is either down
    if(err) {                                     // or restarting (takes a while sometimes).
      console.log('error when connecting to db:', err);
      //setTimeout(db_conn_start, 2000); // We introduce a delay before attempting to reconnect,
    }                                     // to avoid a hot loop, and to allow our node script to
    else{
        console.log('connected to database server.');
    }
  });                                     // process asynchronous requests in the meantime.
                                          // If you're also serving http, display a 503 error.
  dbconn.on('error', function(err) {
    console.log('db error', err);
    if(err.code === 'PROTOCOL_CONNECTION_LOST') { // Connection to the MySQL server is usually
      db_conn_start(db_config);                         // lost due to either server restart, or a
    } else {       
      console.log('throwing err')                               // connnection idle timeout (the wait_timeout
      throw err;                                  // server variable configures this)
    }
  });
}*/

function db_start(db_config){
  if(!db_config.password){
    setTimeout(function(){
      read({ prompt: 'Password: ', silent: true }, function(err, password) {
        db_config.password = password;
        dbconn=mysql.createConnection(db_config);
        replaceClientOnDisconnect(dbconn);
      });
    },1000);
  }else{
    dbconn=mysql.createConnection(db_config);
    replaceClientOnDisconnect(dbconn);
  }
}


db_start(setting.mysql_db_config);


function check_param(param){
  //TODO - Write a parameter checking function here. (to prevent sql injection.)
  // return true when ok. if injection is detected, return false.
  return true;
}

var get_repository_info_by_id = function(repository_id, callback){

  //TODO - parameter checking
  if(typeof(callback) !== 'function') callback = function(data){return data};

  var queryString = "";
  queryString += "select * from cm_repository where repository_id=?;"

  var parameter = [];
  parameter.push(repository_id);

  dbconn.query(queryString, parameter, function(err,rows){
    if(err){
      console.log('get_repository_info_by_id error', err);//TODO - handle err.
      callback(false);
    }else if(rows.length==0){
      console.log('Cannot find repository by id');
      callback(false)
    }else{
      callback(rows[0]);      
    }
  });  
}

exports.get_repository_info_by_id = get_repository_info_by_id;

var get_repository_info_by_name = function(repository_name, callback){

  //TODO - parameter checking
  if(typeof(callback) !== 'function') callback = function(data){return data};

  var queryString = "";
  queryString += "select * from cm_repository where repository_name=?;"

  var parameter = [];
  parameter.push(repository_name);

  dbconn.query(queryString, parameter, function(err,rows,cols){
    if(err){
      console.log('get_repository_info_by_name error', err);//TODO - handle err.
      callback(false);
    }else if(rows.length==0){
      console.log('Cannot find repository by name');
      callback(false)
    }else{
      callback(rows[0]);      
    }
  });  
}

exports.get_repository_info_by_name = get_repository_info_by_name;

var get_repository_user_like = function(repository_id, user_id, callback){
  var get_user_like = 'SELECT * FROM cm_repository_like WHERE repository_id=? AND user_id=? LIMIT 1;'
  parameter = [];
  parameter.push(repository_id)
  parameter.push(user_id);

  dbconn.query(get_user_like, parameter, function(err, rows){
    if(err){
      console.log('get repository user like error', err);
      callback(false);
    }else if(rows.length == 0){
      callback(false);
    }else{
      callback(true);
    }
  })  
}

exports.get_repository_user_like = get_repository_user_like;

var get_repository_review = function(repository_id, callback){
  var get_repository_id, get_repository_review, get_user;

  var parameter = [];
  parameter.push(repository_id);

  get_repository_review   = 'SELECT repository_id, review_title, create_date, reviewer_id, review_comment, review_point FROM cm_review WHERE repository_id = ?';
  get_user                = 'SELECT R.repository_id, U.user_name, R.review_title, R.review_comment, R.review_point, UNIX_TIMESTAMP(R.create_date) as create_time FROM cm_user U, ('+get_repository_review+') R WHERE U.user_id = R.reviewer_id order by create_time desc'; 

  dbconn.query(get_user, parameter, function(err, data){
    if(err){
      console.log('get repository review error', err);
      callback(false);
    }else{
      callback(data);
    }
  });
}

exports.get_repository_review = get_repository_review;

exports.get_repository_data = function(repository_name, user, callback){
  var result = {
    status: true
  }

  get_repository_info_by_name(repository_name, function(data){
    if(!data){
      result.status = false;
      callback(result);
    }else{
      result.info = data;
      get_repository_review(data.repository_id, function(_data){
        if(!_data)
          result.status = false;

        result.review = _data;
        if(user){
          get_repository_user_like(data.repository_id, user, function(islike){
            result.like = islike;
            callback(result);
          });
        }else{
          result.like = false;
          callback(result);
        }
      });
    }
  })
}

exports.is_repository_exist = function(repository_name,callback){

  //TODO - parameter checking
  if(typeof(callback) !== 'function') callback = function(data){return data};

  var queryString = "";
  queryString += "select * from cm_repository where repository_name = ?";

  var parameter = [];
  parameter.push(repository_name);

  dbconn.query(queryString, parameter, function(err, rows, cols){
    if(err){
      console.log('is_repository_exist error', err);
      callback(false);
    } else if(rows==null || rows.length==0){
      callback(false);
    }else{
      callback(rows[0]);
    }
  });
};
exports.insert_like = function(user_id, repository_id, callback){
  var update_query = "UPDATE cm_repository SET repository_like_count = repository_like_count+1 WHERE repository_id=?;"
  var queryString = "INSERT into cm_repository_like (repository_id, user_id) VALUES (?, ?);";
  var parameter = [];
  parameter.push(repository_id);
  parameter.push(user_id);
  dbconn.query(queryString, parameter, function(err,result){
    if(err){
      console.log(err);
      callback(false);
    }
    else {
      var parameter = [];
      parameter.push(repository_id);
      dbconn.query(update_query, parameter, function(err, result){
        if(err){
          console.log(err);
          callback(false);
        }else{
          callback(true);    
        }
      })
    };
  });
}

// exports.insert_new_repository = function(repository_name, user_name, description, date, thumbnail_url, callback){

//   //TODO - parameter checking
//   if(typeof(callback) != 'function') callback = function(){};
//   var queryString = "";
//   queryString += "insert into cm_repository (repository_name, maintainer_id, repository_description, create_date, thumbnail_url) values (?, ";
//   queryString += "(select user_id from cm_user where user_name=?), ?, ?, ?);";

//   var parameter = [];
//   parameter.push(repository_name);
//   parameter.push(user_name);
//   parameter.push(description);
//   parameter.push(date);
//   parameter.push(thumbnail_url);

//   dbconn.query(queryString, parameter, function(err,result){
//     if(err){
//       console.log(err);
//       callback(false);
//     }
//     else {
//       callback(result.insertId);
//     };
//   });//TODO - handle err.

// };




exports.insert_new_repository = function(params, callback){
  if(typeof(callback) != 'function') callback = function(){};
  var new_repo_query = "";
  new_repo_query += "insert into cm_repository (repository_name, maintainer_id, repository_description, create_date, thumbnail_url) values (?, ";
  new_repo_query += "(select user_id from cm_user where user_name=?), ?, ?, ?);";

  var new_repo_query_param_arr = [  params.repository_name,   params.user_name,   params.description,   params.date,   params.thumbnail_url ];

  dbconn.beginTransaction(function(err){
    if(err){ callback(-1);  }
    else{
      dbconn.query(new_repo_query, new_repo_query_param_arr, function(err, new_repo_result){
        if(err){         dbconn.rollback(function(){          callback(-1);        });      }
        else{
          var new_contributor_query = "";
          new_contributor_query+="INSERT INTO cm_contributor (user_id, repository_id) "
          new_contributor_query+="SELECT * FROM "
          new_contributor_query+="(SELECT user_id FROM cm_user WHERE user_name=? LIMIT 1)  user, "
          new_contributor_query+="(SELECT repository_id FROM cm_repository WHERE repository_name=? LIMIT 1) repo "
          var new_contributor_query_params_arr = [params.user_name, params.repository_name];

          dbconn.query(new_contributor_query, new_contributor_query_params_arr, function(err,data){
            if(err){         dbconn.rollback(function(){          callback(-1);        });      }
            else{
              dbconn.commit(function(err){
                if(err){         dbconn.rollback(function(){          callback(-1);        });      }
                else{
                  callback(new_repo_result.insertId);
                  console.log('new repo finally end')
                }
              })
            }
          });
        }



      });
      
    }
    


  });


}











exports.insert_new_commit = function(repository_name, user_name, commit_hash, commit_branch){
  //TODO - parameter checking

  var queryString = "";
  var parameter = [];
  queryString += "select commit_revision from cm_commit where repository_id=(select repository_id from cm_repository where repository_name=?)";
  queryString += "and commit_branch=?"

  parameter.push(repository_name);
  parameter.push(commit_branch);

  dbconn.query(queryString, parameter, function(err, rows, cols){
    if(err) console.log('insert_new_commit error', err);//TODO - handle err.
      var revision=1;
      queryString = "";
      parameter = [];
      queryString += "insert into cm_commit (repository_id,commiter_id,commit_hash,commit_revision,commit_branch) values ";
      queryString += "((select repository_id from cm_repository where repository_name=?), (select user_id from cm_user where user_name=?), ?, ?, ?);";

    if(rows!=null && rows.length!=0)
      revision = rows[rows.length-1].commit_revision + 1;

    parameter.push(repository_name);    
    parameter.push(user_name);
    parameter.push(commit_hash);
    parameter.push(revision);
    parameter.push(commit_branch);

    dbconn.query(queryString, parameter, function(err){if(err) throw err});//TODO - handle err.
  });
};

exports.insert_new_contributor = function(repository_name, user_name){

  //TODO - parameter checking

  var queryString = "";
  queryString += "insert into cm_contributor (repository_id, user_id) values ";
  queryString += "((select repository_id from cm_repository where repository_name=?), (select user_id from cm_user where user_name=?));";

  var parameter = [];
  parameter.push(repository_name);
  parameter.push(user_name);

  dbconn.query(queryString, parameter, function(err){});//TODO - handle err.

}

exports.insert_new_commit_evaluation = function(repository_id, commit_hash, user_name, point){

  //TODO - parameter checking

  var queryString = "";
  queryString += "insert into cm_commit_evaluation (repository_id, commit_id, evaluator_id, evaluation_point)";
  queryString += "values ((select repository_id from cm_repository where repository_name=?), ";
  queryString += "(select commit_id from cm_commit where commit_hash=?), (select user_id from cm_user where user_name=?), ?);";

  var parameter = [];
  parameter.push(repository_name);
  parameter.push(commit_hash);
  parameter.push(user_name);
  parameter.push(point);

  dbconn.query(queryString, parameter, function(err){});//TODO - handle err.

}

exports.insert_verification = function(user_id, verification_key, callback){
  var queryString = "";
  queryString += "DELETE FROM cm_user_verification WHERE user_id=?"
  var parameter = [];
  parameter.push(user_id);
  dbconn.query(queryString, parameter, function(err){
    var queryString = "";
    queryString += "insert into cm_user_verification (user_id, verification_key, is_verified)";
    queryString += "values (?, ?, ?);";  

    var parameter = [];
    parameter.push(user_id);
    parameter.push(verification_key);
    parameter.push(false);
    dbconn.query(queryString, parameter, function(err){
      if(err){
        console.log('insert_verification error', err);
        callback(true, "DATABASE_ERR");
      } else{
        callback(false);
      }
    });
  });
}

exports.do_auth = function(repository_name, user_name, password, callback){
  //TODO - parameter checking

  if(typeof(callback) !== 'function') callback = function(data){return data};

  var result = {}
  var queryString = "";
  queryString += "select * from cm_user where user_name=? and user_passwd=?";

  var parameter = [];
  parameter.push(user_name);
  parameter.push(password);

  dbconn.query(queryString, parameter, function(err, rows, cols){
    if(err) console.log('get_repository_info_by_name error', err);//TODO - handle err.
    if(rows.length==0){
      result.permission = false;
      result.reason = "the user doesnt exist, or password is wrong";
      return callback(result);
    }else{
        result.permission = true;
        return callback(result);
      // queryString = "";
      // queryString += "select * from cm_contributor where (repository_id = (select repository_id from cm_repository where repository_name=?)) ";
      // queryString += "and (user_id = (select user_id from cm_user where user_name=?));";

      // parameter = [];
      // parameter.push(repository_name);
      // parameter.push(user_name);
      // dbconn.query(queryString, parameter, function(err, rows, cols){
      //   if(err) throw err;//TODO - handle err.
      //   if(rows.length==0){
      //     result.permission = false;
      //     result.reason = "no permission";
      //     return callback(result);
      //   }else{
          result.permission = true;
          return callback(result);
      //   }
      // });
    }
  });
 }
exports.edit_user_info = function(data, callback){
  var parameter = [];
  
  parameter.push("user_name");
  parameter.push(data.name);
  parameter.push("user_passwd");
  parameter.push(data.new_passwd);
  parameter.push("user_email");
  parameter.push(data.email);
  parameter.push("user_passwd");
  parameter.push(data.passwd);  

  var queryString = "UPDATE cm_user SET ? = ?, ? = ? WHERE ? = ? AND ? = ?;";

  dbconn.query(queryString, parameter, function(err, res){
    if(err){
      console.log(err);
      callback(err);
    }else{
      callback();
    }
  })
}
exports.update_repository_info_by_name = function(repository_name, setting_name, setting_value){

  //TODO - parameter checking
  var queryString = "";
  queryString += "update cm_repository SET ? = ? where repository_name = ?;";

  var parameter = [];
  parameter.push(setting_name);
  parameter.push(setting_value);
  parameter.push(repository_name);

  dbconn.query(queryString, parameter);//TODO - handle err.
}

exports.update_commit_log_info = function(commit_hash, setting_name, setting_value){

  //TODO - parameter checking

  var queryString = "";
  var parameter = [];

  queryString += "update cm_commit SET commit_log = ? where commit_hash = ?;";

  // parameter.push(setting_name);
  parameter.push(setting_value);
  parameter.push(commit_hash);

  dbconn.query(queryString, parameter);//TODO - handle err.

}

exports.update_contributor_info = function(repository_name, user_name ,setting_name, setting_value){

  //TODO - parameter checking

  var queryString = "";
  queryString += "update cm_contributor SET ? = ? where repository_id=(select repository_id from cm_repository where repository_name=?)";
  queryString += "and (user_id = (select user_id from cm_user where user_name=?));";

  var parameter = [];
  parameter.push(setting_name);
  parameter.push(setting_value);
  parameter.push(repository_name);
  parameter.push(user_name);

  dbconn.query(queryString, parameter);//TODO - handle err.
}
exports.update_user_password = function(user_id, new_password, callback){
  var queryString = "";
  queryString = "UPDATE cm_user SET user_passwd=? WHERE user_id=?;"
  var parameter = [];
  
  parameter.push(new_password);
  parameter.push(user_id);
  dbconn.query(queryString, parameter, function(err){
    if(err) console.log('update_user_password error', err);
    callback();
  });
}

exports.update_user_verification = function(verification_key, user_id, callback){
  var queryString = "";
  queryString = "UPDATE cm_user_verification SET is_verified=? WHERE user_id=? AND verification_key=?;"
  
  var parameter = [];
  parameter.push(true);
  parameter.push(user_id);
  parameter.push(verification_key);
  dbconn.query(queryString, parameter, function(err, result){
    console.log(result);
    if(err) {
      console.log('update_user_verification error', err);
      callback(err);
    }else{
      callback();
    }
  });
}

exports.get_contributor_info_by_name = function(repository_name, user_name, callback){

  //TODO - parameter checking
  if(typeof(callback) != 'function') callback = function(data){return data};

  var queryString = "";
  queryString += "select * from cm_contributor where repository_id=(select repository_id from cm_repository where repository_name=?) ";
  queryString += "and user_id=;"

  var parameter = [];
  parameter.push(repository_name);
  parameter.push(user_name);

  dbconn.query(queryString, parameter, function(err,rows,cols){

    if(err) console.log('get_contributor_info_by_name error', err);//TODO - handle err.
    if(rows.length==0){
      callback(false);
    }else{
      callback(rows[0]);
    }
  });  
}

exports.get_commit_info_by_hash = function(commit_hash, callback){

  //TODO - parameter checking
  if(typeof(callback) != 'function') callback = function(data){return data};

  var queryString = "";
  queryString += "select *, UNIX_TIMESTAMP(A.create_date) as unix_time from (select * from cm_commit where commit_hash = ?) as A, ";
  queryString += "(select user_id, user_email, user_name from cm_user) as B where A.commiter_id = B.user_id";

  var parameter = [];
  parameter.push(commit_hash);

  dbconn.query(queryString, parameter, function(err,rows,cols){
    if(err) console.log('get_commit_info_by_id error', err);//TODO - handle err.
    if(rows.length==0){
      callback(false);
    }else{
      callback(rows[0]);
    }
  });
}

exports.get_commit_info_by_repository_name = function(repository_name, branch, page, callback){

  //TODO - parameter checking
  if(typeof(callback) != 'function') callback = function(){};

  var queryString = "";
  queryString += "select *, UNIX_TIMESTAMP(A.create_date) as unix_time from (select * from cm_commit where commit_branch = ? and repository_id = ";
  queryString +="(select repository_id from cm_repository where repository_name = ?)) as A ";
  queryString +="inner join (select user_id, user_email, user_name from cm_user) as B ";
  queryString +="on A.commiter_id = B.user_id order by commit_id desc Limit ?, ?;";

  var parameter = [];
  parameter.push(branch);
  parameter.push(repository_name);
  parameter.push((page-1)*15);
  parameter.push((page)*15);

  dbconn.query(queryString, parameter, function(err,rows,cols){

    if(err) console.log('get_commit_info_by_repository_name error', err);//TODO - handle err.
    callback(rows, cols);
  });
}

// exports.get_commit_info_by_hash = function(repository_name, branch, commit_hash, callback){
//   if(typeof(callback) != 'function') callback = function(){};
//   var queryString = "";
//   queryString += "select * from (select * from cm_commit where commit_hash = ?) as A, (select user_id, user_email, user_name from cm_user) as B where A.commiter_id = B.user_id";

//   var parameter = [];
//   parameter.push(commit_hash);

//   dbconn.query(queryString, parameter, function(err,rows,cols){

//     if(err) console.log('get_commit_info_by_repository_name error', err);//TODO - handle err.

//     callback(rows, cols);
//   });  
// }

exports.update_for_evaluation = function(repository_name, user_name, point){

  //TODO - parameter checking

  var queryString = "";
  queryString+="update cm_commit SET progress_point = progress_point+? where commit_id in (select commit_id from "
  queryString+="cm_commit_evaluation where repository_id=(select repository_id from cm_repository where repository_name=?)"
  queryString+="and evaluator_id=(select user_id from cm_user where user_name=?));"

  var parameter = [];
  parameter.push(point);
  parameter.push(repository_name);
  parameter.push(user_name);

  dbconn.query(queryString,parameter, function(err){
    if(err) throw err;//TODO - handle err.
  });
};



exports.get_user_by_user_email = function(user_email, callback){

  //TODO - parameter checking
  if(typeof(callback) != 'function') callback = function(){};
  var queryString = 'SELECT * FROM cm_user WHERE user_email=?;';

  dbconn.query(queryString, user_email, function(err, rows) {
    if(err) {
      console.log("get_user_by_user_email error", err);
      return callback(err);
    }

    var user;
    if(rows)
      user = rows[0];

    if(!user) {
      //    console.log(verified);
      return callback(null, false, { errno : 101, message : 'User not exist.' });
    }

    return callback(null, user);

  });
};

exports.get_user_by_user_name = function(user_name, callback) {
  //TODO - parameter checking
  if(typeof(callback) != 'function') callback = function(){};
  var queryString = 'SELECT * FROM cm_user WHERE user_name=?;';
  dbconn.query(queryString, user_name, function(err, rows){
    if(rows.length==0){
      callback(false);
    }else{
      callback(rows[0]);
    }
  });
};

exports.get_user_by_user_id = function(params, callback) {

  //TODO - parameter checking
  if(typeof(callback) != 'function') callback = function(){};

  var queryString = 'SELECT * FROM cm_user WHERE user_id=? LIMIT 1;';
  var params_arr=[];
  params_arr.push(params.user_id);

  dbconn.query(queryString, params_arr, function(err, user){
    if (err) {
      return callback(err);
    }

    callback(null, user);
  });
};


exports.insert_user = function(user, callback){

  //TODO - parameter checking
  if(typeof(callback) != 'function') callback = function(){};

  /*var qs = 'INSERT INTO cm_user'
      + '(user_email, user_passwd, user_name, user_nickname, user_job,'
      + 'user_sex, user_homepage, user_recommend_id, user_profile, user_ip,'
      + 'user_ip_country, user_reg_date, user_state, user_open_level,'
      + 'user_range) VALUES(?,?,?,?,?,?,?,?,?,?,?,now(),?,?,?);';*/
  var queryString = 'INSERT INTO cm_user'
      + '(user_email, user_passwd, user_name, user_reg_date) '
      + 'VALUES(?,?,?,now());';


  dbconn.query(queryString, user, function(err, user){
    if(err){
      return callback(true, "DATABASE_ERR");
    }

    callback(false, user);
  });//TODO

};

exports.login = function(user, callback){
  if(typeof(callback) !== 'function') callback = function(data){return data};
  var qs = 'SELECT * FROM cm_user WHERE user_email=? AND user_passwd=?'
  dbconn.query(qs, user, function(err, user){
    if(err)
      return callback({result: false});
    if(user && user.length != 0){
      var parameter = []
      parameter.push(user[0].user_id);
      var qs = 'SELECT is_verified FROM cm_user_verification WHERE user_id=?';
      dbconn.query(qs, parameter, function(err, verified){
        if(err){
           callback({result: false});
        } else{
          console.log(verified)
          callback({result: true, name: user[0].user_name}, user[0], (verified[0].is_verified == 1 ? true : false)); 
        } 
      })
      
    }else
      callback({result: false});
  })
}


exports.get_user_project_list = function(user, callback){
  if(typeof(callback) !== 'function') callback = function(data){return data};
  var project_list_query = '', get_user_id = '';
  get_user_id += 'SELECT user_id from cm_user where user_email = ?';
  project_list_query += 'SELECT * from cm_repository where maintainer_id = ('+get_user_id+')';

  dbconn.query(project_list_query, user, function(err, project_list){
    if(err)
      return callback(err);
    else
      callback(project_list);
  });
}


exports.best_seller = function(params, user, callback){
  var get_repository_id, get_repository_info, language_id_query, language_query, user_name, get_like;
  //default recent 1 week
  if(params && params.start && params.end){
    var parameter=[];
    parameter.push(params.start);
    parameter.push(params.end);

    get_repository_id    ='SELECT COUNT(*) count, repository_id from cm_deal WHERE created_date > ? AND created_date < ? GROUP BY seller_id ORDER BY count LIMIT 0, 15';
    language_id_query    ='SELECT lan.language_id, pro.repository_id, pro.count FROM cm_repository_language lan, (' + get_repository_id + ') pro WHERE lan.repository_id=pro.repository_id'
    language_query       ='SELECT lan.language_name, lan_id.repository_id, lan_id.count FROM ('+language_id_query+') lan_id, cm_language lan WHERE lan.language_id=lan_id.language_id'
    get_repository_info  ='SELECT P.repository_name FROM cm_repository P, (' + language_query + ') C WHERE C.repository_id=P.repository_id'
    dbconn.query(get_repository_info, parameter, function(err, data){
      console.log('err', err);
      if(err) calback(false);
      else callback(data);
    });
  }else{
    get_repository_id    ='SELECT COUNT(*) count, repository_id, seller_id from cm_deal WHERE created_date BETWEEN date_sub(now(), INTERVAL 2 WEEK) and now() GROUP BY repository_id ORDER BY count DESC LIMIT 0, 15';
    language_id_query    ='SELECT lan.language_id, pro.repository_id, pro.count FROM cm_repository_language lan, (' + get_repository_id + ') pro WHERE lan.repository_id=pro.repository_id'
    language_query       ='SELECT lan.language_name, lan_id.repository_id, lan_id.count FROM ('+language_id_query+') lan_id, cm_language lan WHERE lan.language_id=lan_id.language_id'
    get_repository_info  ='SELECT P.repository_description, P.thumbnail_url, P.review_point, P.review_count, P.repository_name, P.repository_id, C.language_name, P.repository_like_count FROM cm_repository P, (' + language_query + ') C WHERE C.repository_id=P.repository_id ORDER BY C.count'
    dbconn.query(get_repository_info, function(err, data){
      if(err){
        console.log('err', err);
        callback(false);
      } 
      else {
        if(user){
          exports.get_user_like_list(user, function(err, list){
            callback(data, list);
          })
        }else{
          callback(data, false);
        }
        
        
      }
    });
  }
}
exports.attention_project = function(lan, catelog, callback){
  
}



exports.put_repository_review = function(projectInfo, callback){

  var queryString, get_repository_id, get_reviewer_id;
  var parameter = [];

  parameter.push(projectInfo.repository_name);
  parameter.push(projectInfo.reviewInfo.name);
  parameter.push(projectInfo.reviewInfo.point);
  parameter.push(projectInfo.reviewInfo.title);
  parameter.push(projectInfo.reviewInfo.comment);

  get_repository_id = '(SELECT repository_id FROM cm_repository WHERE repository_name = ? )';
  get_reviewer_id = '(SELECT user_id FROM cm_user WHERE user_name = ? )'
  queryString = 'INSERT INTO cm_review (repository_id, reviewer_id, review_point, review_title, review_comment) VALUES ('+get_repository_id+', '+get_reviewer_id+', ?, ?, ?)';
  
  dbconn.query(queryString, parameter, function(err, data){
    if(err){
      console.log('err', err);
      callback(false);
    }else{
      callback(data);
    }
  })
}
exports.get_user_like_list = function(user_id, callback){
  //R.thumbnail_url,
  var get_repository_id = "SELECT repository_id FROM cm_repository_like WHERE user_id = ?"
  var get_repository_info = "SELECT R.repository_name, R.repository_id, R.repository_like_count FROM cm_repository R, (" + get_repository_id + ") RI WHERE R.repository_id=RI.repository_id;"
  var queryString = get_repository_info;
  var parameter = [];
  parameter.push(user_id);
  dbconn.query(queryString, parameter, function(err, data){
    if(err){
      console.log(err);
      callback("DATABASE_ERR");
    }else{
      callback(false, data);
    }
  });
}

// var offer={}
/////// offer.repository_name='simdj/pintos';


// offer.repository_id = 10
// offer.seller_id = 1
// offer.buyer_id = 2
// offer.buyer_name='pcs';




// offer.price='1000';
// offer.expiration_date='20140101';
// offer.purpose='purpose  111';
// offer.explanation='detail 1111';

//$.post('/ajax/deal/offer', offer, function(data){console.log(data)})

//deal 
exports.deal_offer = function(params, callback){
  var params_arr=[];
  params_arr.push(params.repository_id);
  params_arr.push(params.seller_id);
  params_arr.push(params.buyer_id);
  params_arr.push(params.buyer_name);

  // var get_repository_info = 'SELECT repository_id, maintainer_id FROM cm_repository WHERE repository_name = ?';
  // var get_user_id = 'SELECT user_id FROM cm_user WHERE user_name = ?';

  var get_deal_info="[repository_id] , [seller_id] , [buyer_id], [buyer_name], [price], [expiration_date], [purpose], [explanation]"
  get_deal_info=get_deal_info.replace("[repository_id]", '(SELECT "'+params.repository_id+'") repository_id')
  get_deal_info=get_deal_info.replace("[seller_id]", '(SELECT "'+params.seller_id+'") seller_id')
  get_deal_info=get_deal_info.replace("[buyer_id]", '(SELECT "'+params.buyer_id+'") buyer_id')
  get_deal_info=get_deal_info.replace("[buyer_name]", '(SELECT "'+params.buyer_name+'") buyer_name')

  get_deal_info=get_deal_info.replace("[price]", '(SELECT "'+params.price+'") price')
  get_deal_info=get_deal_info.replace("[expiration_date]", '(SELECT "'+params.expiration_date+'") expiration_date')
  get_deal_info=get_deal_info.replace("[purpose]", '(SELECT "'+params.purpose+'") purpose')
  get_deal_info=get_deal_info.replace("[explanation]", '(SELECT "'+params.explanation+'") explanation')

  

  var qs='INSERT INTO cm_deal (repository_id,  seller_id, buyer_id, price, expiration_date, purpose, explanation ) '+
    'SELECT * FROM '+  get_deal_info;


  
  dbconn.query(qs, params_arr, function(err,data){
    console.log(data);
    if(!err && data  && data.affectedRows>0){
      callback(data);
    }else{
      console.log('deal offer err', err);
      callback(false)
    }
  })

}

// var update={}
// update.deal_id=5;
// update.price='1000';
// update.expiration_date='20140101';
// update.purpose='purpose  111';
// update.explanation='detail 1111';
// $.post('/ajax/deal/update', update, function(data){console.log(data)})
exports.deal_update = function(params, callback){
  var params_arr=[];

  var edit="";


  params_arr.push(params.status);
  edit+=" status = ?"
  

  if(params.price){
    params_arr.push(params.price);
    edit+=" , price =  ? "
  }

  if(params.expiration_date){
    params_arr.push(params.expiration_date);
    edit+=" , expiration_date =  ? "
  }

  if(params.purpose){
    params_arr.push(params.purpose);
    edit+=" ,  purpose =  ?"
  }

  if(params.explanation){
    params_arr.push(params.explanation);
    edit+=", explanation =  ? "
  }
  


  params_arr.push(params.deal_id);
  var qs="UPDATE cm_deal SET [edit], created_date=NOW() WHERE deal_id=?;"
  qs=qs.replace("[edit]",edit);

  console.log(qs);

  dbconn.query(qs, params_arr, function(err,data){
    console.log(data);
    if(!err && data && data.affectedRows>0){
      callback(data);
    }else{
      callback(false);
    }
  });

}


// var list={};
// list.repository_name='simdj/pintos';
// list.seller_name='simdj'
// list.buyer_name='pcs';
//$.post('/ajax/deal/list', list, function(data){console.log(data)})


// exports.deal_list = function(params, callback){

//   var repository_name=params.repository_name || '' ;
//   var buyer_name=params.buyer_name || '';
//   var seller_name=params.seller_name || '';

//   var get_repo_id="SELECT repository_id FROM cm_repository WHERE repository_name=?";
//   var get_user_id="SELECT user_id FROM cm_user WHERE user_name=?"

//   var query_style=0;
//   var params_arr=[];


//   if(  repository_name ){
//     query_style+=1;
//     params_arr.push(repository_name);
//   }
//   if(buyer_name){
//     query_style+=2;
//     params_arr.push(buyer_name);
//   }
//   if(seller_name){
//     query_style+=4;
//     params_arr.push(seller_name);
//   }



//   //0 -> every deal (not confined by any repo or buyer)
//   //1 -> deal by repo
//   //2 -> deal by buyer
//   //3 -> deal by repo,buyer

//   //4 -> deal by seller
//   //5 -> deal by seller, repo

//   //6 -> deal by buyer, seller
//   //7 -> deal by buyer, repo, seller
//   var qs='';
//   switch(query_style){
    
//     case 1:
//       qs = "SELECT * FROM cm_deal WHERE repository_id IN ("+get_repo_id+")";
//       break;
//     case 2:
//       qs = "SELECT * FROM cm_deal NATURAL JOIN cm_repository WHERE buyer_id IN ("+get_user_id+")";
//       break;
//     case 3:
//       qs = "SELECT * FROM cm_deal WHERE repository_id IN ("+get_repo_id+") AND buyer_id IN ("+get_user_id+")";
//       break;


//     case 4:
//       qs = "SELECT * FROM cm_deal WHERE seller_id IN ("+get_user_id+")";
//       break;
//     case 5:
//       qs = "SELECT * FROM cm_deal WHERE repository_id IN ("+get_repo_id+") AND seller_id IN ("+get_user_id+")";
//       break;

//     case 6:
//       qs = "SELECT * FROM cm_deal WHERE buyer_id IN ("+get_user_id+") AND seller_id IN ("+get_user_id+")";
//       break;
//     case 7:
//       qs = "SELECT * FROM cm_deal WHERE repository_id IN ("+get_repo_id+") AND buyer_id IN ("+get_user_id+") AND seller_id IN ("+get_user_id+")";
//       break;


//     case 0:
//     default:    
//       qs = "SELECT * FROM cm_deal";
//       break;
//   }


//   dbconn.query(qs, params_arr, function(err,data){
//     if(err){
//       console.log('deal list err', err);
//       callback([])
//     }else{
//       callback(data)
//     }
//   });
// }

// var read={};
// read.deal_id=1;
// $.post('/ajax/deal/1', {}, function(data){console.log(data)})

exports.deal_read  = function(params, callback){
  //var qs='SELECT * FROM cm_deal WHERE deal_id=? '
  var params_arr=[];
  params_arr.push(params.deal_id);


  var qs='SELECT [project_column] [from] [where] LIMIT 1'
  var project_column='deal.deal_id, deal.created_date, '
  project_column+='deal.price, deal.expiration_date, deal.purpose, deal.explanation, deal.status, deal.seller_comment, ';
  project_column+=' buyer.user_id AS "buyer_id", buyer.user_name AS "buyer_name", seller.user_id AS "seller_id", seller.user_name AS "seller_name", repo.repository_id, repo.repository_name';

  var from=' from cm_deal deal natural join cm_repository repo'
  from+=' join cm_user buyer on buyer.user_id=deal.buyer_id join cm_user seller on seller.user_id=deal.seller_id ';
  
  var where=' where deal.deal_id=?'

  qs=qs.replace('[project_column]',project_column);
  qs=qs.replace('[from]',from);
  qs=qs.replace('[where]',where);
  //   select 
  // deal.deal_id, deal.created_date, 
  // deal.price, deal.expiration_date, deal.purpose, deal.explanation, deal.status, deal.seller_comment, 

  // buyer.user_name,
  // seller.user_name,
  // repo.repository_name

  // from cm_deal deal
  // join cm_user buyer on buyer.user_id=deal.buyer_id
  // join cm_user seller on seller.user_id=deal.seller_id
  // natural join cm_repository repo

  // where deal.deal_id>4

  dbconn.query(qs, params_arr, function(err,data){
    if(!err){
      callback(data);
    }else{
      console.log('deal read err', err);
      callback(false)
    }
  });
}

// var progress_list={}
// progress_list.op='OR';
// progress_list.buyer_name='pcs';
// progress_list.seller_name='pcs';
// progress_list.status_condition='(status = "NEGOTIATING" ) '
// $.post("/ajax/deal/list/progress", progresS_list, function(data){console.log(data)})

exports.deal_list = function(params, callback){
  var op=params.op || '';
  var buyer_name=params.buyer_name || '';
  var seller_name=params.seller_name || '';
  var status_condition=params.status_condition || '';


  var params_arr=[];
  var qs = "SELECT * FROM cm_deal NATURAL JOIN cm_repository [condition] ORDER BY  cm_deal.created_date DESC";

  var condition = "WHERE ( [seller_condition] [op] [buyer_condition] ) [status_condition]  "
  var get_user_id="SELECT user_id FROM cm_user WHERE user_name=?"




  if(op){
    condition=condition.replace("[op]",op);
  }else{
    condition=condition.replace("[op]","");
  }

  if(seller_name){
    condition=condition.replace("[seller_condition]","seller_id IN ("+get_user_id+")");
    params_arr.push(seller_name);
  }else{
    condition=condition.replace("[seller_condition]","");
  }


  if(buyer_name){
    condition=condition.replace("[buyer_condition]","buyer_id IN ("+get_user_id+")");
    params_arr.push(buyer_name);
  }else{
    condition=condition.replace("[buyer_condition]","");
  }

  if(status_condition){
    condition=condition.replace("[status_condition]", "AND "+status_condition)
    //params_arr.push(status);
  }else{
    condition=condition.replace("[status_condition]", "")
  }

  //WHERE [seller_id IN ([seller_id_query]) OR buyer_id IN ([buyer_id_query])";

  qs=qs.replace("[condition]", condition);
  
  dbconn.query(qs, params_arr, function(err,data){
    if(err){
      console.log('deal list  progress err', err);
      callback([])
    }else{
      callback(data)
    }
  });

  
}


// var accept={};
// accept.deal_id=1;
exports.deal_accept = function(params, callback){


  var qs='UPDATE cm_deal'
        +' SET status="ACCEPTED", seller_comment=? , created_date=NOW()'
        +' WHERE deal_id=?';
  var params_arr=[];
  params_arr.push(params.seller_comment)
  params_arr.push(params.deal_id);


  dbconn.query(qs, params_arr, function(err,data){
    if(!err && data && data.affectedRows>0){
      callback(data);
    }else{
      callback(false);
    }
  });

}



// var deny={};
// deny.deal_id=1;
exports.deal_deny = function(params, callback){

  var qs='UPDATE cm_deal'
        +' SET status="DENIED", seller_comment=? , created_date=NOW()'
        +' WHERE deal_id=?';
  var params_arr=[];
  params_arr.push(params.seller_comment)
  params_arr.push(params.deal_id);


  dbconn.query(qs, params_arr, function(err,data){
    if(!err && data && data.affectedRows>0){
      callback(data);
    }else{
      callback(false);
    }
  });

}

exports.deal_cnt = function(params, callback){
  var buyer_id=params.buyer_id || '';
  var seller_id=params.seller_id || '';
  var status_condition=params.status_condition || '1=1';

  var qs="SELECT COUNT(*) AS deal_cnt FROM cm_deal WHERE ( [status_condition] )AND ( [user_condition] )";
  var params_arr=[]
  
  qs=qs.replace("[status_condition]",status_condition);

  if(buyer_id){
    qs=qs.replace("[user_condition]","buyer_id=? ");
    params_arr.push(buyer_id);
  }else if(seller_id){
    qs=qs.replace("[user_condition]","seller_id=? ");
    params_arr.push(seller_id);
  }
  


  dbconn.query(qs, params_arr, function(err, data){
    if(err){
      console.log('deal_cnt err', err);
      callback(false);
    }else{
      callback(data[0].deal_cnt);
    }
  });

}


// var notice_create_req={
//   msg : 'hi', receiver_name : 'simdj'
// }
// $.post('/notice/create', notice_create_req, function (data){console.log(data)})
exports.notice_create = function(params, callback){
   var qs='INSERT INTO cm_notification (msg, receiver_id) SELECT * FROM ([get_note_info]) note_info;'
  

  var get_note_info = 'SELECT "[msg]", [receiver_id] ';
  get_note_info=get_note_info.replace("[msg]", params.msg);
  get_note_info=get_note_info.replace("[receiver_id]", params.receiver_id );


  var get_receiver_id =  params.receiver_id ;



  qs=qs.replace("[get_note_info]", get_note_info);


  dbconn.query(qs, function(err,data){

    if(!err && data && data.affectedRows>0){
      callback(data);
    }else{
      console.log(err)
      callback(false);
    }
  });



}

// var notice_list_req={
//   receiver_name : 'asdf'
// }
// $.post('/notice/list', notice_list_req, function (data){console.log(data)})

exports.notice_list  = function (params, callback){
  var qs="SELECT * FROM cm_notification WHERE [condition] ORDER BY  created_date DESC ";
  

  var params_arr=[];

  var condition='';
  if(params.receiver_name){
    var get_receiver_id = 'SELECT user_id FROM cm_user WHERE user_name = ?';
    var receiver_condition = 'receiver_id IN ([get_receiver_id])'

    receiver_condition=receiver_condition.replace('[get_receiver_id]',get_receiver_id);  
    condition+=receiver_condition;
    params_arr.push(params.receiver_name)
  }

  if(params.state){
    var state_condition = 'AND state=? '
    condition+=state_condition;
    params_arr.push(params.state);
  }  
  qs=qs.replace('[condition]', condition);

  dbconn.query(qs, params_arr, function(err,data){
    if(!err ){
      callback(data);
    }else{

      callback([]);
    }
  });




}
// var notice_read_req={
// note_id : '5'
// }
// $.post('/notice/read', notice_read_req, function (data){console.log(data)})

exports.notice_read = function(params, callback){
  var qs='SELECT * FROM cm_notification WHERE note_id=?'
  var params_arr=[];
  params_arr.push(params.note_id);

  dbconn.query(qs, params_arr, function(err,data){
    if(!err){
      callback(data);
    }else{
      callback(false);
    }
  });

}


// var notice_update_req={
// note_id : '5',
// state : 'CHECKED'
// }
// $.post('/notice/update', notice_update_req, function (data){console.log(data)})
exports.notice_update = function(params, callback){
  var qs='UPDATE cm_notification SET state=?  WHERE note_id=?';

  var params_arr=[];
  params_arr.push(params.state);
  params_arr.push(params.note_id);



  dbconn.query(qs, params_arr, function(err,data){
    if(!err && data && data.affectedRows>0){
      callback(data);
    }else{
      callback(false);
    }
  });

}

exports.add_review_count = function(repositoryInfo, callback){
  if(typeof(callback) != 'function') callback = function(){};

  var params = [];
  var queryString = "";
  queryString += "update cm_repository SET review_count = review_count+1, review_point = review_point+? where repository_name = ?";

  params.push(repositoryInfo.reviewInfo.point);
  params.push(repositoryInfo.repository_name);

  dbconn.query(queryString, params, function(err, data){
    if(err){
      console.log('add_review_count err', err);
      callback(false);
    }
    else{
      params = [];
      params.push(repositoryInfo.repository_name);

      queryString = "select repository_id from cm_repository where repository_name = ?";
      dbconn.query(queryString, params, function(err, data){
        if(err){
          console.log('select repository error', err);
          callback({status:false});
        }else{
          callback({status:true, data: data});
        }
      })
    }
  });
}

exports.add_view_count = function(repository_id, callback){
  if(typeof(callback) != 'function') callback = function(){};

  var params = [];
  var queryString = "";
  queryString += "update cm_repository SET view_count = view_count+1 where repository_id = ?";

  params.push(repository_id);

  dbconn.query(queryString, params, function(err, data){
    if(err){
      console.log('add view count mysql error');
      callback(false);
    }
    else{
      callback(true);
    }
  });
}

exports.add_cart_multiple = function(user_id,repository_id_list, callback){
  if(typeof(callback) != 'function') callback = function(){};

  var params = [];
  var queryString = "";
  if(repository_id_list.length){
    queryString+= "insert into cm_cart (user_id, repository_id) values "
    repository_id_list.forEach(function(repository_id){
        params.push(user_id);
        params.push(repository_id);
        queryString+= "(?, ?),"
    })
    queryString=queryString.slice(0,-1)
    queryString +=" ON DUPLICATE KEY UPDATE user_id=user_id";
    console.log(queryString)
    console.log(params)
    dbconn.query(queryString, params, function(err, data){
      if(err){
        console.log(err);
        callback(false);
      }else{
        callback(data.length);
      }
    })
  }else{
    callback(false);
  }
}
exports.add_cart = function(user_id,repository_id, callback){
  if(typeof(callback) != 'function') callback = function(){};

  var params = [];
  var queryString = "";
  params.push(user_id);
  params.push(repository_id);
  queryString += "insert into cm_cart (user_id, repository_id) values (?, ?);";
  dbconn.query(queryString, params, function(err, data){
    if(err){
      console.log(err);
      callback(false);
    }else{
      callback(true);
    }
  })
}

exports.is_exist_cart = function(user_id,repository_id, callback){
  if(typeof(callback) != 'function') callback = function(){};

  var params = [];
  var queryString = "";
  params.push(user_id);
  params.push(repository_id);
  queryString += "select * from cm_cart where user_id=? and repository_id=? LIMIT 1";
  dbconn.query(queryString, params, function(err, data){
    if(err){
      console.log(err);
      callback(false);
    }else{
      if(data.length){
        callback(true);  
      }else{
        callback(false);  
      }
      
    }
  })
}
exports.delete_like = function(user_id, repository_id, callback){
  var update_query = "UPDATE cm_repository SET repository_like_count = repository_like_count-1 WHERE repository_id=?;"
  var queryString = "DELETE FROM cm_repository_like WHERE repository_id=? AND user_id=?;";
  var parameter = [];
  parameter.push(repository_id);
  parameter.push(user_id);
  dbconn.query(queryString, parameter, function(err,result){
    if(err){
      console.log(err);
      callback(false);
    }
    else {
      var parameter = [];
      parameter.push(repository_id);
      dbconn.query(update_query, parameter, function(err, result){
        if(err){
          console.log(err);
          callback(false);
        }else{
          callback(true);    
        }
      })
    };
  });
}
//not tested
exports.delete_cart = function(user_id,repository_id, callback){
  if(typeof(callback) != 'function') callback = function(){};

  var params = [];
  var queryString = "";
  params.push(user_id);
  params.push(repository_id);
  queryString += "delete from cm_cart where user_id=? and repository_id =? LIMIT 1";
  dbconn.query(queryString, params, function(err, data){
    if(err){
      console.log(err);
      callback(false);
    }else{
      callback(true);
    }
  })
}

exports.get_cart_list = function(user_id, callback){
  if(typeof(callback) != 'function') callback = function(){};

  var params = [];
  var queryString = "";
  params.push(user_id);

  queryString += "select cm_repository.* from cm_repository where cm_repository.repository_id IN (select cm_cart.repository_id from cm_cart where cm_cart.user_id=?)";
  dbconn.query(queryString, params, function(err, data){
    if(err||!data.length){
      console.log(err);
      callback(false);
    }else{
      callback(data);
    }
  })
}

// password change!!!!
// update 
//    cm_user 
// SET 
// user_passwd = 
// (select * from (select user_passwd from cm_user where user_name='asdf') x )

// where 
// 1=1






exports.payment_insert = function(params, callback){


  //   INSERT INTO cm_payment (deal_id, pay_amount) 
  // SELECT * FROM
  // ( SELECT "1" ) deal,
  // ( SELECT price FROM cm_deal WHERE deal_id=1) amount


  var qs='INSERT INTO cm_payment  (deal_id, pay_amount)  SELECT * FROM  ( [deal] ) deal, ( [amount] ) amount ';

  var deal="SELECT "+params.deal_id;
  var amount="SELECT price FROM cm_deal WHERE deal_id=?"

  qs=qs.replace('[deal]',deal);
  qs=qs.replace('[amount]',amount);


  var params_arr=[];
  params_arr.push(params.deal_id)


  dbconn.query(qs, params_arr, function(err, data){
    if(!err && data && data.affectedRows > 0){
      callback(data);
    }else{
      console.log('pay add err', err, data);
      callback(false);
    }
  })

}
exports.payment_insert_deal_id_arr = function(params, callback){
  var value_arr_str='';
  params.receiver_list.forEach(function(el){
    if(el.deal_id){
      value_arr_str+=',( '+el.deal_id+' , '+el.amount+' , "'+params.pay_key+'", "'+params.pay_url+'")'
    }
  })
  value_arr_str=value_arr_str.substr(1);
  var qs="INSERT INTO cm_payment (deal_id, pay_amount,pay_key, pay_url) VALUES " +value_arr_str;
  console.log('')
  console.log(qs);
  dbconn.query(qs, function(err, data){
    if(!err && data && data.affectedRows > 0){
      callback(data);
    }else{
      console.log('payment_insert_deal_id_arr err', err, data);
      callback(false);
    }
  })
}

exports.payment_update = function(params, callback){
  var qs="UPDATE cm_payment SET status=?, pay_date=NOW() WHERE pay_id=? LIMIT 1";

  var params_arr=[];
  params_arr.push(params.status);
  params_arr.push(params.pay_id);

  dbconn.query(qs, params_arr, function(err, data){
    if(!err && data && data.affectedRows > 0){
      callback(data);
    }else{
      console.log('payment_update err', err, data);
      callback(false);
    }
  })




}


exports.payment_update_pay_key = function(params, callback){


  //UPDATE cm_payment SET pay_key='1' WHERE deal_id IN (1,2)
  var qs="";
  qs+="UPDATE cm_payment SET pay_key=? , pay_url=? ";
  qs+="WHERE deal_id IN ("+params.deal_id_arr.join(',')+")"

  var params_arr=[];
  params_arr.push(params.pay_key)
  params_arr.push(params.pay_url)

  dbconn.query(qs, params_arr, function(err, data){
    if(!err && data && data.affectedRows > 0){
      callback(data);
    }else{
      console.log('payment_update_pay_key err', err, data);
      callback(false);
    }
  })
}



exports.get_pay_bill_by_deal_id = function(params, callback){

  var qs="";

  qs+="SELECT deal_id, price AS amount , paypal_id AS email ";
  qs+=" FROM cm_deal  JOIN cm_user_additional_info ON cm_deal.seller_id=cm_user_additional_info.user_id ";
  qs+="WHERE deal_id IN ("+params.deal_id_arr.join(',')+")"

  
  

  dbconn.query(qs,  function(err, data){
    if(!err){
      callback(data);
    }else{
      console.log('get_pay_bill_by_deal_id err', err, data);
      callback(false);
    }
  })
  

}

exports.get_donate_bill_by_donee_repo_arr = function(params, callback){
  var qs="";

  qs+="SELECT repository_id,  paypal_id AS email ";
  qs+=" FROM cm_repository  JOIN cm_user_additional_info ON cm_repository.maintainer_id=cm_user_additional_info.user_id ";
  qs+="WHERE repository_id IN ("+params.donee_repo_arr.join(',')+")"

  
  

  dbconn.query(qs,  function(err, data){
    if(!err){
      callback(data);
    }else{
      console.log('get_donate_bill_by_donee_repo_arr err', err, data);
      callback(false);
    }
  })
  
}

exports.get_paypal_id_by_user_id = function(params, callback){
  var qs='SELECT paypal_id FROM cm_user_additional_info where user_id=?'
  var params_arr=[];
  params_arr.push(params.user_id);
  dbconn.query(qs, params_arr, function(err, data){
    if(!err){
      callback(data);
    }else{
      console.log('get_paypal_id_by_user_id err', err)
      callback(false);
    }
  })

}

exports.get_pay_url_by_deal_id = function(params, callback){
  var qs='SELECT * FROM cm_payment WHERE deal_id=?';
  var params_arr=[];
  params_arr.push(params.deal_id);
  dbconn.query(qs, params_arr, function(err, data){
    if(!err){
      callback(data);
    }else{
      console.log('get_pay_url_by_deal_id err', err)
      callback(false);
    }
  })
}


exports.get_pay_info_by_pay_key = function(params, callback){
  //do not limit 1 
  var qs='SELECT * from cm_payment where pay_key=?';
  var params_arr=[];
  params_arr.push(params.pay_key);

  dbconn.query(qs, params_arr, function(err, data){
    if(!err){
      callback(data);
    }else{
      console.log('get_pay_info_by_tracking_id err', err)
      callback(false);
    }
  });

}


exports.license_insert_by_deal_info = function(params, callback){
  var qs="INSERT INTO cm_license (repository_id, authorized_user_id, expiration_date)  SELECT * FROM ([get_deal_info]) license_info"
  
  var get_deal_info="SELECT repository_id, buyer_id, expiration_date FROM cm_deal WHERE deal_id=?"
  
  qs=qs.replace('[get_deal_info]', get_deal_info);


  var params_arr=[];
  params_arr.push(params.deal_id);
  


  dbconn.query(qs, params_arr, function(err, data){
    if(!err && data && data.affectedRows > 0){
      callback(data);
    }else{
      console.log('license_insert err', err, data);
      callback(false);
    }
  })
}
exports.license_cnt = function(params, callback){
  var authorized_user_id=params.buyer_id || '';
  var seller_id=params.seller_id || '';

  var params_arr=[];
  var qs="SELECT COUNT(*) AS license_cnt FROM cm_license WHERE [condition]";


  var condition="";

  if(authorized_user_id && seller_id){
    condition+="authorized_user_id=? AND seller_id=?";
    params_arr.push(authorized_user_id);
    params_arr.push(seller_id);
  }else if(authorized_user_id){
    condition+="authorized_user_id=? ";
    params_arr.push(authorized_user_id);
  }else if(seller_id){
    condition+="seller_id=? ";
    params_arr.push(seller_id);
  }else{
    callback([]);
    return false;
  }
  qs=qs.replace("[condition]",condition);

  dbconn.query(qs, params_arr, function(err, data){
    if(err){
      console.log('license_cnt err', err);
      callback(false);
    }else{
      callback(data[0].license_cnt);
    }
  });





}

exports.license_list = function(params, callback){



  var op=params.op || '';
  var buyer_id=params.buyer_id || '';
  var seller_id=params.seller_id || '';
  var status_condition=params.status_condition || '';


  var params_arr=[];
  var qs = "SELECT cm_license.*, cm_repository.*  FROM cm_license NATURAL JOIN cm_repository [condition] ORDER BY  created_date DESC";

  var condition = "WHERE ( [seller_condition] [op] [buyer_condition] ) [status_condition]  "
  var get_user_id="SELECT user_id FROM cm_user WHERE user_name=?"



  if(op){
    condition=condition.replace("[op]",op);
  }else{
    condition=condition.replace("[op]","");
  }

  if(seller_id){
    condition=condition.replace("[seller_condition]","seller_id =? ");
    params_arr.push(seller_id);
  }else{
    condition=condition.replace("[seller_condition]","");
  }


  if(buyer_id){
    condition=condition.replace("[buyer_condition]","authorized_user_id = ?");
    params_arr.push(buyer_id);
  }else{
    condition=condition.replace("[buyer_condition]","");
  }

  if(status_condition){
    condition=condition.replace("[status_condition]", "AND "+status_condition)
    //params_arr.push(status);
  }else{
    condition=condition.replace("[status_condition]", "")
  }

  //WHERE [seller_id IN ([seller_id_query]) OR buyer_id IN ([buyer_id_query])";

  qs=qs.replace("[condition]", condition);



  dbconn.query(qs, params_arr, function(err, data){
    if(err){
      console.log('license_list err', err);
      callback([]);
    }else{
      callback(data);
    }
  });
  
};



exports.license_read = function(params, callback){
  var license_id=params.license_id || '';
  var qs='SELECT * FROM cm_license WHERE license_id=?'
  var params_arr=[];
  params_arr.push(license_id);

  dbconn.query(qs, params_arr, function(err, data){
    if(err){
      console.log('license_list err', err);
      callback([]);
    }else{
      callback(data);
    }
  });
}





// var donate_insert_req={};
// donate_insert_req.donor_id=1;
// donate_insert_req.repository_id=12;
// donate_insert_req.donate_amount=13;
// donate_insert_req.donate_pay_key='1dsadfsdfsdf';
// $.post('/donate/insert', donate_insert_req, function(d){console.log(d)})
exports.donate_insert = function(params, callback){
  

  var params_arr=[];
  params_arr.push(params.donor_id)
  params_arr.push(params.repository_id)
  params_arr.push(params.donate_amount)
  params_arr.push(params.donate_pay_key)

  var qs="INSERT INTO cm_donate (donor_id, repository_id, donate_amount, donate_pay_key) VALUES (?,?,?,?)";

  dbconn.query(qs, params_arr, function(err, data){
    if(!err && data && data.affectedRows > 0){
      callback(data);
    }else{
      console.log('donate_insert err', err, data);
      callback(false);
    }
  })
}


//params will be pay_key

// var donate_update_req={};
// donate_update_req.donate_pay_key='AP-8SS03906PR1140209';
// $.post('/donate/update', donate_update_req, function(d){console.log(d)})
exports.donate_update = function(params, callback){
  var qs="UPDATE cm_donate SET donate_date=NOW(), [donate_status] WHERE donate_pay_key=?"

  qs=qs.replace("[donate_status]", "donate_status='"+params.donate_status+"'")

  var params_arr=[];
  params_arr.push(params.donate_pay_key);

  dbconn.query(qs, params_arr, function(err, data){
    if(!err && data && data.affectedRows > 0){
      callback(data);
    }else{
      console.log('donate_update err', err, data);
      console.log(qs, params_arr)
      callback(false);
    }
  })
}




//params will be pay_key
exports.donate_list = function(params, callback){
  var qs="SELECT * FROM cm_donate"


  var params_arr=[];

  dbconn.query(qs, params_arr, function(err, data){
    if(err){
      console.log('donate_list err', err);
      callback([]);
    }else{
      callback(data);
    }
  });
}

// var sales_statistics_req={};
// sales_statistics_req.seller_id=1;
// sales_statistics_req.repository_id=11;

// $.post('/sales/statistics', sales_statistics_req, function(d){console.log(d)})

exports.sales_statistics = function(params, callback){
  var qs="SELECT SUM(price) AS sales_volume, COUNT(*) AS sales_cnt FROM cm_deal WHERE [sales_condition]";

  var params_arr=[];

  var seller_id=params.seller_id || '';
  var repository_id=params.repository_id || '';

  var seller_condition=" AND seller_id=? " ;
  var repo_condition  = " AND repository_id=? ";


  var sales_condition='1=1';


  if(seller_id){
    params_arr.push(seller_id);
    sales_condition+=seller_condition;
  }
  if(repository_id){
    params_arr.push(repository_id);
    sales_condition+=repo_condition;
  }
  qs=qs.replace('[sales_condition]',sales_condition);

  dbconn.query(qs, params_arr, function(err, data){
    if(err){
      console.log('sales_statistics err', err);
      callback([]);
    }else{
      callback(data);
    }
  });


}


// var maintainer_list_req={};
// maintainer_list_req.maintainer_id=1
// $.get('/simdj/project_list', maintainer_list_req, function(data){console.log(data)})
exports.maintaining_list_by_user_id =function(params, callback){
  var qs='SELECT * FROM cm_repository WHERE maintainer_id=?';
  var params_arr=[];

  params_arr.push(params.maintainer_id);

  dbconn.query(qs, params_arr, function(err, data){
    if(err){
      console.log('maintaining_list_by_user_id err', err);
      callback([]);
    }else{
      callback(data);
    }
  }); 
}


// var sales_req={};
// sales_req.maintainer_id=1
// $.get('/simdj/sales', sales_req, function(data){console.log(data)})
exports.sales_by_user_id =function(params, callback){
  var qs='SELECT sales_volume, sales_cnt, repository_name FROM cm_repository WHERE maintainer_id=?';
  var params_arr=[];

  params_arr.push(params.maintainer_id);

  dbconn.query(qs, params_arr, function(err, data){
    if(err){
      console.log('maintaining_list_by_user_id err', err);
      callback([]);
    }else{
      callback(data);
    }
  }); 
}


// SELECT SUM(price), COUNT(*),  YEAR(pay_complete_date), MONTH(pay_complete_date) , repository_id 
// FROM 'cm_deal'
// WHERE status='COMPLETED' 
// GROUP BY  YEAR(pay_complete_date), MONTH(pay_complete_date), repository_id


// var monthly_sales_req={};
// monthly_sales_req.seller_id=1
// monthly_sales_req.group_by_repo='' // true;
// monthly_sales_req.repository_id=1

// $.get('/simdj/monthly_sales', monthly_sales_req, function(data){console.log(data)})

exports.monthly_sales_by_user_id = function(params, callback){

  var params_arr=[];


  var qs='SELECT SUM(price) AS sales_volume, COUNT(*) AS sales_cnt,  DATE_FORMAT( pay_Complete_date, "%Y-%m" ) AS date ,  YEAR(pay_complete_date) AS year, MONTH(pay_complete_date) AS month [group_by_repo]';
  
  qs+=" FROM cm_deal "
  qs+=" WHERE seller_id=? AND status='COMPLETED' [repo_condition] "
  
  qs+=" GROUP BY  YEAR(pay_complete_date), MONTH(pay_complete_date)   [group_by_repo] "


  params_arr.push(params.seller_id);


  if(params.group_by_repo){
    qs=qs.replace(  '[group_by_repo]', ', repository_id ' );     qs=qs.replace(  '[group_by_repo]', ', repository_id ' );
  }else{
    qs=qs.replace(  '[group_by_repo]', '' );    qs=qs.replace(  '[group_by_repo]', '' );
  }



  if(params.repository_id){
    qs=qs.replace('[repo_condition]'  ,   " AND repository_id=? ");
    params_arr.push(params.repository_id);
  }else{
    qs=qs.replace('[repo_condition]'  ,   "");
  }


  dbconn.query(qs, params_arr, function(err, data){
    if(err){
      console.log('monthly_sales_by_user_id err', err);
      callback([]);
    }else{
      callback(data);
    }
  }); 
}


exports.get_donate_info = function (params, callback){
  var params_arr=[];
  var qs='SELECT SUM(donate_amount) AS pledged, COUNT(donate_amount) AS backers FROM cm_donate WHERE donate_status="COMPLETED" AND repository_id=? ';

  params_arr.push(params.repository_id);

  dbconn.query(qs, params_arr, function(err, data){
    if(err){
      console.log('get_donate_info err', err);
      callback([]);
    }else{
      callback(data);
    }
  }); 
}

exports.get_user_info = function(params, callback){

  var queryString = "SELECT * FROM cm_user_additional_info WHERE user_id=?";

  dbconn.query(queryString, params, function(err, data){
    callback(err, data);
  });   
}

exports.update_user_info = function(target, params, callback){

  var queryString = "UPDATE cm_user_additional_info SET "+target+" = ? WHERE user_id=?";

  dbconn.query(queryString, params, function(err, data){
    callback(err, data);
  });   
}

exports.insert_fork = function(repository_id, user_id, callback){
  var qs = "INSERT INTO cm_fork (repository_id, user_id) VALUES(?, ?)";
  var params_arr = [repository_id, user_id];
  
  dbconn.query(qs, params_arr, function(err, data){
    if(err){
      console.log('insert fork error', err);
      callback(null);
    }else{
      callback(data);
    }
  });
}


