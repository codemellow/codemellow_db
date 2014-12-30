
/*
 * GET home page.
 */
var repo_handler = require('../modules/repository/repository_handler');
var Base64 = require("../node_modules/base64/base64");
var fs = require('fs');
var setting = require("../settings");
var webserver_origin = setting.data.webserver_origin;
var ERROR_MESSAGE = require("../common").ERROR_MESSAGE;


var error_handler = function(res, err){
	console.log("ERROR : ", err);
	res.writeHead(404);
	res.end();
}

var result_handler = function(res, data){
  	res.writeHead(200, { 'Content-Type': 'application/json' });
  	res.write(JSON.stringify({status:true, data:data}));	
  	res.end();
}

var argument_checking = function(argument, res){
	if(!argument){
		error_handler(res, ERROR_MESSAGE.NONE_ARGUMENT);
	}
}
exports.history_of_file = function(req, res){
	argument_checking(req.body);

	repo_handler.history_of_file(req.body, function(err, data){
		if(err) error_handler(res, err);
		else result_handler(res, data);
	});
}
exports.get_left_file_contents = function(req, res){
	argument_checking(req.body, res);

	repo_handler.get_left_file_contents(req.body, function(err, data){
	  	if(err) error_handler(res, err);
	  	else result_handler(res, data);		
	});
};

exports.commit_diff = function(req, res){
	argument_checking(req.body, res);

	repo_handler.commit_diff(req.body, function(err, data){
		if(err) error_handler(res, err);
		else result_handler(res, data);
	});

};
exports.get_readme_preview = function(req, res){
	argument_checking(req.body, res);
	repo_handler.readme_preview(req.body, function(err, data){
		if(err) error_handler(res, err);
		else result_handler(res, data);		
	});
};

exports.view_file_code = function(req, res){
	argument_checking(req.body, res);

	repo_handler.view_code(req.body, function(err, data){
		if(err) error_handler(res, err);
		else result_handler(res, data);		
	});
};

exports.view_dir = function(req, res){
	argument_checking(req.body, res);

	repo_handler.view_dir(req.body, function(err, data){
		if(err) error_handler(res, err);
		else result_handler(res, data);
	});
};

exports.image_load = function(req, res){
	var imagePath = Base64.decode(req.params.image_base64);

	fs.readFile(imagePath, function(err, data){
		if(err) throw err;
		res.writeHead(200, {
			'Content-Type': 'image/jpg',
			'Content-Length': data.length
		});
		res.end(data, 'binary');
	})
}

exports.new_project = function(req, res){
   var buf;
   if(req.body.image_data)
      var image_buf = new Buffer(req.body.image_data.split(',')[1], 'base64');

   repo_handler.create(req.body, image_buf, function(err, data){
      console.log(data);
      if(err){
         console.log('Create repository ERROR');
         console.log(err);
         res.redirect(webserver_origin + '404page');
      }else{
         console.log('success', data);
         res.redirect(webserver_origin + 'dev');
      }
   });   
}

exports.git_archive_download = function(req, res){

	var repository_name = req.params.user + '/' + req.params.project;
	var repos_path = setting.data.default_repos_path + '/' + repository_name + '.git'
	var zip_path = repos_path + '/' + repository_name.replace('/', '_') + '.zip';

	fs.exists(zip_path, function(exist){
		if(!exist){
			repo_handler.create_archive(repository_name, function(err){
				if(err){
					console.log('git archive error', err);
					res.end();
				}else{
					res.download(zip_path);
				}
			});
		}
		else{
			res.download(zip_path);
		}
	})
}

exports.repository_fork = function(req, res){
	argument_checking(req.body, res);

	repo_handler.fork(req.body, function(err, data){
		if(err) error_handler(res, err);
		else result_handler(res, data);		
	});
}

exports.repository_commit = function(req, res){
	argument_checking(req.body, res);
	repo_handler.commit(req.body, function(err, data){
		if(err) error_handler(res, err);
		else result_handler(res, data);		
	});	
}

exports.news = function(req, res){
	argument_checking(req.body, res);	
	repo_handler.get_news(req.body, function(err, data){
		if(err) error_handler(res, err);
		else result_handler(res, data);		

	});
}

exports.news_bulk = function(req, res){
	argument_checking(req.body, res);	
	repo_handler.get_news_bulk(req.body, function(err, data){
		if(err) error_handler(res, err);
		else result_handler(res, data);		

	});
}

exports.repository_commit_count = function(req, res){
	argument_checking(req.body, res);	
	repo_handler.commit_count(req.body, function(err, data){
		if(err) error_handler(res, err);
		else result_handler(res, data);		

	});	
}

exports.repository_commit_list = function(req, res){
	argument_checking(req.body, res);	
	repo_handler.commit_list(req.body, function(err, data){
		if(err) error_handler(res, err);
		else result_handler(res, data);		

	});	
}

exports.repository_branch_count = function(req, res){
	argument_checking(req.body, res);	
	repo_handler.branch_count(req.body, function(err, data){
		if(err) error_handler(res, err);
		else result_handler(res, data);		

	});	
}
