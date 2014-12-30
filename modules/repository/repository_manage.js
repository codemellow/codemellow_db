

var mysql_handler = require('../mysql_handler/mysql_handler');
var settings = require('../../settings');
var crypto = require('crypto');
var url = require('url');
var qs = require('querystring');
var services = [ 'upload-pack', 'receive-pack' ];
var current_user;

module.exports = {
	repos: null,
	repos_path: null,

	repos_init: function(repos, repos_path){

		var self = this;
		this.repos = repos;
		this.repos_path = repos_path;

		repos.on('push', function (push) {
		    console.log('push ' + push.repo + '/' + push.commit
		        + ' (' + push.branch + ')'
		    );

			var repo = push.repos;
			repo = push.repo;
			console.log('Got a PUSH call for', push.repo);
			console.log(push.url);

			var log_data = {
				status: push.status,
				repo: push.repo,
				service: push.service,
				cwd: push.cwd,
				last: push.last,
				commit: push.commit,
				evName: push.evName,
				branch: push.branch,
				commiter : current_user,
				method : 'push',
				date : new Date()
			}
			
			if (repo !== false) {
				self.push_commit(log_data);
				return self.processSecurity(push, 'push', repo);
			} else {
				console.log('Rejected - Repo', push.repo, 'doesnt exist');
				return push.reject(500, 'This repo doesnt exist');
			}

		});

		repos.on('fetch', function (fetch) {
		    console.log('fetch ' + fetch.commit);
			console.log('Got a FECTH call for', fetch.repo);
			console.log(fetch.url)
		    fetch.accept();
		});

		repos.on('info', function (fetch) {
			var repo, auth;
			var u = url.parse(fetch.url);
			var m = u.pathname.match(/\/(.+)\/info\/refs$/);
			if (!m) return fetch.reject(500,  'This repo doesnt exist');
			if (/\.\./.test(m[1])) return fetch.reject(500, 'This repo doesnt exist');

		    var repo = m[1];
		    var params = qs.parse(u.query);

		    if (!params.service) {
		        return fetch.reject(500, 'git service do not designated');
		    }

		    var service = params.service.replace(/^git-/, '');

			auth = fetch.request.headers['authorization'];
			if(auth !== void 0){
				console.log('Got a INFO call for', fetch.repo);
				console.log(fetch.url);
				console.log('auth : ', auth);
			}

			switch(services.indexOf(service)){
				//push, 
				case 1:
					if (repo.anonRead === true) {
						checkTriggers('fetch', repo);
						return fetch.accept();
					} else {
						return self.processSecurity(fetch, 'push', repo);
					}					
				break;
				//pull, fetch, checkout event
				case 0:
				default:
				fetch.accept();
			}
		});
		console.log('git server start');
	},

	processSecurity: function(gitObject, method, repo) {

	  var auth, creds, plain_auth, req, res;
	  req = gitObject.request;
	  res = gitObject.response;
	  auth = req.headers['authorization'];
	  if (auth === void 0) {
	    res.statusCode = 401;
	    res.setHeader('WWW-Authenticate', 'Basic realm="Secure Area"');
	    return res.end('<html><body>Need some creds son</body></html>');
	  } else {
	    plain_auth = (new Buffer(auth.split(' ')[1], 'base64')).toString();
	    creds = plain_auth.split(':');
	    console.log(creds)
	    return this.permissableMethod(creds[0], creds[1], method, repo, gitObject);
	  }
	},

	permissableMethod: function(username, password, method, repo, gitObject) {
		var self = this;
		var user, _ref;
		console.log(username, 'is trying to', method, 'on repo:', repo, '...');
		current_user = null;

		this.getUser(username, password, repo, function(auth_Object){
			current_user = username;
			if(method == 'push'){
				var log_data = {				
					repo: repo,
					commiter : current_user,
					method : 'push',
					date : new Date()
				}
			}
			if(auth_Object.permission){
			  	console.log(username, 'Successfully did a', method, 'on', repo);
			  	return gitObject.accept();
			}else{
				console.log(username, 'was rejected as', auth_Object.reason, 'to', method, 'on', repo);
				return gitObject.reject(500, 'bye');
			}
		});
	},

	checkTriggers: function(method, repo, gitObject) {
	  var _base;
	  if (repo.onSuccessful != null) {
	    if (repo.onSuccessful[method] != null) {
	      console.log('On successful triggered: ', method, 'on', repo);
	      return typeof (_base = repo.onSuccessful)[method] === "function" ? _base[method](repo, method, gitObject) : void 0;
	    }
	  }
	},

	getUser: function(username, password, repo, cb) {

	  //change this should be auth in DB
	  var crypted_password = crypto.createHmac('sha256',settings.data.hashkey).update(password).digest('binary');

	  mysql_handler.do_auth(repo, username, crypted_password, function(result){
		  var auth_Object = {
		  	permission: result.permission,
		  	reason: result.reason
		  };

		  cb(auth_Object);
	  });
	},

	logging: function(data){
		// console.log('LOG : ', data);
	},

	push_commit: function(data){
		this.logging(data);
		mysql_handler.insert_new_commit(data.repo.split('.git')[0], data.commiter, data.commit, data.branch);
	},

	pull_request: function(data){
		var options = {
			cwd: this.repos_path + '/' + data.repo
		};
		exec('git branch ' + data.branch_name, options, function(err, stdout, stderr){
			if(err) console.log(err);
		});
	}
}
