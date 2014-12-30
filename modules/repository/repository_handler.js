var repos;
var path=require('path');
var exec = require('child_process').exec;
var syntax_highlight=require("../syntax_highlight/syntax_highlight");
var mysql_handler = require('../mysql_handler/mysql_handler');
var markup=require("../markup/markup")
var fs = require('fs');
var Base64 = require("../../node_modules/base64/base64");
var setting = require("../../settings");
var elastic_handler = require("../elastic_search_handler/elastic_search_handler");
var spawn = require('child_process').spawn;
var exec = require('child_process').exec;
var self = this;

var reposerver_origin = setting.data.reposerver_origin;


var git_log_to_json=""
	git_log_to_json+='git log  --date=relative [log_num]  '
    git_log_to_json+=' --pretty=format:\'{%n  "commit": "%H",%n  "author": "%an <%ae>",%n  "date": "%ad",%n  "message": "%f"%n},\' $@ | '
    git_log_to_json+=' perl -pe \'BEGIN{print "["}; END{print "]\n"}\' |  '
    git_log_to_json+=' perl -pe \'s/},]/}]/\' '


function get_cmd_git_log(log_num){
	return git_log_to_json.replace('[log_num]','-'+log_num)
}

function is_clone_folder_exist(path,callback){
	if(!callback)
		throw "no callback"
	fs.exists(path, function (exists) {
	  callback(exists ? true : false);
	});
}

function write_commit_file(path,data,callback){
	if(!callback)
		throw "no callback"
	fs.writeFile(path, data, function (err) {
	  if (err) 
	  	callback(false);
	  else
	  	callback(true);
	});
}


function git_commit_command_with_none_clone(repository_name,username,file_path_with_name,filedata,commit_msg,callback){
	var clone_path=setting.data.default_repos_path + '/' + repository_name+"_"+username;
	var temp_path=clone_path+"_tmp"
	write_commit_file(temp_path,filedata,function(result){
		if(!result){
			callback(false)
		}else{
			var ps = spawn('sh',[path.join(__dirname, './git_commit_command_with_none_clone.sh'),clone_path,path.join(clone_path,file_path_with_name),temp_path,commit_msg]);
	    		var diff_data = "";
		    ps.stdout.on('data', function (data) {
		      diff_data +=data;
		    });
		    ps.stdout.on('end', function (err) {
		      var split_data = diff_data.split('\n');
		      if(err)
		      	callback(false)
			  else {
			  	callback(diff_data)
			  }
		   });
		}
	})
}
function git_commit_command_clone(repository_name,username,email,file_path_with_name,filedata,commit_msg,callback){
	var clone_path=setting.data.default_repos_path + '/' + repository_name+"_"+username;
	var bare_repo=setting.data.default_repos_path + '/' + repository_name + '.git';
	var temp_path=clone_path+"_tmp"
	write_commit_file(temp_path,filedata,function(result){
		if(!result){
			callback(false)
		}else{
			var ps = spawn('sh',[path.join(__dirname, './git_commit_command_clone.sh'),bare_repo,clone_path,username,email,path.join(clone_path,file_path_with_name),temp_path,commit_msg]);
		    var diff_data = "";
		    ps.stdout.on('data', function (data) {
		      diff_data +=data;
		    });
		    ps.stdout.on('end', function (err) {
		      var split_data = diff_data.split('\n');
		      if(err)
		      	callback(false)
			  else {
			  	callback(diff_data)
			  }
		    });	
		}
		
	})
}
function dateFormat (date, fstr, utc) {
  utc = utc ? 'getUTC' : 'get';
  return fstr.replace (/%[YmdHMS]/g, function (m) {
    switch (m) {
    case '%Y': return date[utc + 'FullYear'] (); // no leading zeros required
    case '%m': m = 1 + date[utc + 'Month'] (); break;
    case '%d': m = date[utc + 'Date'] (); break;
    case '%H': m = date[utc + 'Hours'] (); break;
    case '%M': m = date[utc + 'Minutes'] (); break;
    case '%S': m = date[utc + 'Seconds'] (); break;
    default: return m.slice (1); // unknown code, remove %
    }
    // add leading zero if required
    return ('0' + m).slice (-2);
  });
}

var make_image_dir = function(path, callback){
	fs.exists(path, function(exist){
		if(!exist)
			fs.mkdir(path, callback);
		else
			callback();
	})
}

var save_project_image = function(buf, newPath, callback){
	make_image_dir(newPath, function(err){
		if(err){
			console.log('make image dir error');
			callback(false);
		}else{
			var filePath = newPath + '/title.' + "png";
			fs.writeFile(filePath, buf, function(err){
				if(err){
					console.log('imagewrite error');
					callback(false);
				}else{
					console.log('Project image saved')
					callback(filePath);
				}
			})
		}
	});
}

// function(repository_id,repository_name, project_name, repository_description, date, thumbnail_url
var insert_projectInfo = function(user_name, projectInfo, callback){

	var repository_name 	= user_name + '/' + projectInfo.name;
	var description 		= projectInfo.description ? projectInfo.description : null;
	var imagePath 			= projectInfo.imagePath ? Base64.encode(projectInfo.imagePath) : null;
	var thumbnail_url 		= imagePath ? reposerver_origin + 'images/' + imagePath : "";
	var date 				= dateFormat(new Date (), "%Y-%m-%d %H:%M:%S", true);


	var new_repo_info={

		repository_name : repository_name
	   ,user_name : user_name
	   ,description : description
	   ,date : date
	   ,thumbnail_url : thumbnail_url
	};


	mysql_handler.insert_new_repository(new_repo_info, function(repo_id){
		if(repo_id){
			elastic_handler.insert_new_repository(repo_id, repository_name, projectInfo.name, description, date, thumbnail_url, function(err, res){
				if(err){
					console.log('elastic insert repository error', err);
					callback(false);
				}else{
					console.log("Create repository successfully");
					if(projectInfo.auto_init){
						mysql_handler.get_user_by_user_name(user_name, function(userData){
							if(userData){
								init_commit(repository_name, userData, projectInfo.init_commit_obj, function(isSucess){
									if(isSucess)
										callback(res);
									else
										callback(false);
								})
							}else{
								console.log('not registered');
								callback(false);
							}
						})
					}else{
						callback(res);
					}
				}
			});			
		}else{
			console.log('Insert Repository ERROR:Mysql Insert Project');
			callback(false);
		}
	});
}

function init_commit(repository_name, userData, commit_obj, callback){
	if(!repository_name||!userData||!commit_obj){
		callback(false)
	}
	git_commit_command_clone(repository_name, userData.user_name, userData.user_email, commit_obj.file_path_with_name, commit_obj.file_content,commit_obj.commit_msg, function(result){
		if(result){
			callback(true)
		}else{
			callback(false)
		}
	})
};

function readdir(path, callback){
  if(typeof callback !== 'function') return null;
  fs.readdir(path, function(err, files){
    if(!err){
      callback(files);
    }else{
      callback([]);
    }
  });
}

function mysql_rebase(option, path, errMsg, callback){
	callback(errMsg, null);
}

function git_rebase(option, path, errMsg, callback){
	callback(errMsg, null);
}


//$.get('/simdj/pintos/news', function(D){console.log(D)})
function get_news(info, callback){
	var repository_name=info.repository_name.trim();
	var git_dir_path=setting.data.default_repos_path + '/' + repository_name + '.git'
	var cmd=" [ -d [git_dir_path] ] && [git_log_cmd] || echo 'no_git' ";
	cmd=cmd.replace('[git_dir_path]', git_dir_path).replace('[git_log_cmd]', get_cmd_git_log(3) )
	exec(cmd, {cwd:setting.data.default_repos_path + '/' + repository_name + '.git'}, function(err, stdout, stderr){
		if(err || stdout=='no_git\n'){
			callback(err, []);
		}else{
			callback( err , JSON.parse(stdout) );
		}
	});


	//just body
	//callback(null, repository_name);
}


function get_news_recursive( arr, index, final_callback){
	if(index==arr.length){
		final_callback(null, arr);
	}else{
		get_news(arr[index], function(err, log_data){
			arr[index].news=log_data;
			get_news_recursive(arr, index+1, final_callback);

		});


	}
}
module.exports = {
	repos : null,

	init : function(repos){
		this.repos = repos;
	},

	create : function(postData, buf, callback){
		var self = this;
		var projectInfo = postData.projectInfo;
		var repository_name = postData.user_name + '/' + projectInfo.name;

		projectInfo.init_commit_obj = {};
		projectInfo.init_commit_obj.file_path_with_name = projectInfo.auto_init ? "./README.md" : null;
		projectInfo.init_commit_obj.file_content = projectInfo.auto_init ? "test content" : null;
		projectInfo.init_commit_obj.commit_msg = projectInfo.auto_init ? "Initail commit" : null;
		// console.log(postData)
		if(postData.user_name && postData.projectInfo){
			self.repos.create(repository_name, function(err){
				if(!err){
					var new_filePath = setting.data.default_repos_path + '/' + repository_name + '.git/images';
					if(buf){
						save_project_image(buf, new_filePath, function(imagePath){
							projectInfo.imagePath = imagePath;
							insert_projectInfo(postData.user_name, projectInfo, function(success){
								if(success){
									callback(null, success);
								}else{
									callback('Create Repository ERROR:Mysql Insert Fail', null);
								}
							});
						});
					}else{

						insert_projectInfo(postData.user_name, projectInfo, function(success){
							if(success){
								callback(null, success);
							}else{
								callback('Create Repository ERROR:Mysql Insert Fail', null);
							}							
						});
					}
				}else{
					git_rebase(null, null, "Create Repository ERror:Git Create ERROR", callback);
				}
			});
		}else{
			callback('Create project error', null);		
		}
	},

	commit_diff : function(data, callback){
		var execString = 'git show --date=short --pretty=format:"%an\n%ad %ar\n%s" ' + data.commit_hash;
		exec(execString, {cwd:setting.data.default_repos_path + '/' + data.repository_name + '.git'}, function(err, stdout, stderr){
			if(err){
				console.log(stderr);
				callback("Branch count Error", null);
			}else{
				var split_data = stdout.split('\n');
				callback(null, split_data);
			}
		});

		/*var ps = spawn('git',['show', commit_hash], {cwd:setting.data.default_repos_path + '/' + repository_name + '.git'});
	    var diff_data = "";
	    ps.stdout.on('error', function(err){
	    	console.log(err)
	    })
	    ps.stdout.on('data', function (data) {
	      diff_data +=data;
	    });
	    ps.stdout.on('end', function (err) {
	      var split_data = diff_data.split('\n');
	      console.log(split_data);
	      callback(err, split_data);
	    });		*/
	},

	view_code : function(data, callback){
		var self = this;
		var file_path = data.file_path;
		var repository_name = data.repository_name;

		var temp_file_name = (repository_name + '/' + file_path).replace(/\//g, '_');
		var file_abs_path = setting.data.git_temp_file_path+temp_file_name;
		
		if(data.highlight == "true"){
			exec('git show HEAD:'+file_path+' > '+file_abs_path, {cwd:setting.data.default_repos_path + '/' + repository_name + '.git'}, function(err){
				if(err){
					callback(err, null);
				}else{
					self.code_highlight(file_path.split('.').pop(), file_abs_path, callback);
				}
			});
		}else{
			var ps = spawn('git',['show', 'HEAD:'+file_path], {cwd:setting.data.default_repos_path + '/' + repository_name + '.git'});
		    var content = "";
		    ps.stdout.on('data', function (data) {
		      content +=data;
		    });
		    ps.stdout.on('end', function (err) {
		      	callback(err, content);
		    });	
		}
	},

	code_highlight : function(file_type, file_abs_path, callback){
		switch(file_type){
		    case 'textile':
		    case 'md':
		    case 'mediawiki':
				markup.markup_parse(file_abs_path, function(data){
					callback(null, data);
				});
				break;
		    default:
				syntax_highlight.syntax_parse(file_abs_path, function(data){
					callback(null, data);
				});
		}			
	},
	
	readme_preview : function(data, callback){
		var file_path = data.file_path;
		var repository_name = data.repository_name;

		var temp_file_name = (repository_name + '/' + file_path).replace(/\//g, '_');
		var file_abs_path = setting.data.git_temp_file_path+temp_file_name;
		var file_type=file_path.split('.').pop()
		switch(file_type){
		    case 'textile':
		    case 'md':
		    case 'mediawiki':
				markup.markup_preview_parse(data.code_data, function(data){
					callback(null, data);
				});
		}			
	},

	view_dir : function(data, callback){
		var self = this;
		var resultData = {
			repository_id : null,
			files : []
		};

		var repository_name=data.repository_name;
		var temp_file_name = (repository_name + '/' + data.dir_path).replace(/\//g, '_');
		var file_abs_path = setting.data.git_temp_file_path+temp_file_name;
		var content = '';
		mysql_handler.is_repository_exist(repository_name, function(isExist){
			if(isExist){
				resultData.repository_id = isExist.repository_id;
				exec('git ls-tree HEAD:'+data.dir_path+' > '+file_abs_path, {cwd:setting.data.default_repos_path + '/' + repository_name + '.git'}, function(err){
					if(err){
						console.log('view dir error');
						callback(err, null);
					}else{
						fs.readFile(file_abs_path, function(err, data){
							content+=data;
							if(err){
								callback(err, null);
							}
							else {
								self.dir_parsing(content, resultData, callback);
							}
						});
					}
				});				
			}else{
				callback("Repository isn`t exist.", null);
			}

		});
	},

	dir_parsing : function(data, resultData, callback){
		var output_lines = data.split('\n');
		var i, length = output_lines.length;

		var dir_arr=[], file_arr=[];

		for(i=0;i<length; i++){
			var split_data = output_lines[i].split(' ');
			switch(split_data[1]){
				case 'tree':
					dir_arr.push({
						name: output_lines[i].split('\t')[1],
						type: 'dir'
					});
					break;
				case 'blob':
					file_arr.push({
						name: output_lines[i].split('\t')[1],
						type: 'file'
					});
					break;
				default:
			}
		}
		resultData.files = dir_arr.concat(file_arr);
		callback(null, resultData);
	},

	create_archive : function(repository_name, callback){
		var repos_path = setting.data.default_repos_path + '/' + repository_name + '.git';
		exec('git archive --format zip --output '+ repos_path + '/' + repository_name.replace('/','_') + '.zip master' , {cwd:repos_path}, function(err, stdout, stderr){
			callback(err);
		});		
	},

	//git show 865422caec2e856d1b3fb194880a2b2f19fdfaa2:a.c | head -n 60 | tail -n 15
	get_left_file_contents : function(info, callback){
	
		var repository_name=info.repository_name.trim();
		var commit_hash=info.commit_hash;
		var file_name = info.file_name;
		var start_line = info.start_line;
		var end_line = info.end_line;
		var diff_line = end_line - start_line + 1;

		var ps = exec('git show '+commit_hash+':'+file_name+' | tail -n +'+start_line+' | head -n '+diff_line, {cwd: setting.data.default_repos_path + '/' + repository_name + '.git'});
		//var ps = spawn('git',['show', commit_hash+":"+file_name + " | head -n " + end_line + " | tail -n " + diff_line], {cwd:setting.data.default_repos_path + '/' + repository_name + '.git'});
		var diff_data = "";
		ps.stdout.on('data', function (data) {
			diff_data +=data;
		});
		
		ps.stdout.on('end', function (err) {
			var split_data = diff_data.split('\n');
			callback(err, split_data);
		});
	},
	
	history_of_file: function(info, callback){
		var repository_name=info.repository_name.trim();
		var file_name = info.file_name;
		var branch = info.branch;
		var start = (info.page - 1) * 15 + 1;
		var end = info.page * 15;
		var ps = exec('git log ' + branch + ' --follow --pretty=format:"%H # %cd # %cn # %s" -- ' + file_name + ' | tail -n +' + start + ' | head -n ' + (end - start + 1), {cwd:setting.data.default_repos_path + '/' + repository_name + '.git'}, function(err, stdout, stderr){
			var split_data = stdout.split('\n');
			callback(err, split_data);
		});
	},

	fork : function(data, callback){

		var ps = exec('bash '+path.join(__dirname, './git_repository_fork.sh') + ' ' + data.origin_repo_path + '.git ' + data.target_repo_path + '.git', function(err){
			if(err){
				git_rebase(null, null, 'Repository Fork Shell ERROR: '+err,callback);
			}else{
				mysql_handler.insert_fork(data.origin_repo_id, data.user_id, function(fork_id){
					if(fork_id){
						var projectInfo = {
							name : data.project_name,
							description : data.repository_description
						};
						insert_projectInfo(data.name, projectInfo, function(isSucess){
							if(isSucess){
								callback(null, fork_id);
							}else{
								callback("Repository Fork ERROR: Mysql Insert ERROR", null);
							}
						});
					}else{
						mysql_rebase(null, null, "Insert Fork ERROR:Mysql Insert Fork Fail", callback);
					}
				});
			}
		});
	},
	
	commit : function(data, callback){
		var clone_path=setting.data.default_repos_path + '/' + data.repository_name+"_"+data.username;
		is_clone_folder_exist(clone_path, function(is_exist){
			if(is_exist){
				git_commit_command_with_none_clone(data.repository_name, data.username, data.file_path_with_name, data.file_content, data.commit_msg, function(result){
					if(result){
						callback(null, result);
					}else{
						callback("Commit none clone ERROR:", null);
					}
				})
			}else{
				git_commit_command_clone(data.repository_name, data.username, data.email, data.file_path_with_name, data.file_content, data.commit_msg, function(result){
					if(result){
						callback(null, result);
					}else{
						callback("Commit clone ERROR:", null);
					}
				})
			}
		})
	},

	commit_count : function(data, callback){
		exec('git rev-list HEAD --count', {cwd:setting.data.default_repos_path + '/' + data.repository_name + '.git'}, function(err, stdout, stderr){
			if(err){
				callback("Commit count ERROR:"+stderr, null);
			}else{
				callback(null, stdout);
			}
		});
	},

	commit_list : function(data, callback){
		var execString = 'git log --skip={{page}} --date=short --pretty=format:"%H %an %ad %ar %s" -20';
		var page = parseInt(data.page) < 1 ? 0 : (parseInt(data.page)-1);
		execString = execString.replace('{{page}}', page*20);

		exec(execString, {cwd:setting.data.default_repos_path + '/' + data.repository_name + '.git'}, function(err, stdout, stderr){
			if(err){
				callback("Branch count ERROR:"+stderr, null);
			}else{
				callback(null, stdout);
			}
		});
	},

	branch_count : function(data, callback){
		exec('git branch | wc -l', {cwd:setting.data.default_repos_path + '/' + data.repository_name + '.git'}, function(err, stdout, stderr){
			if(err){
				callback("Branch count ERROR:"+stderr, null);
			}else{
				callback(null, stdout);
			}
		});		
	},

	get_news : get_news,

	//$.post('/news/bulk', {arr:['simdj/pintos5', 'simdj/asdf']}, function(d){console.log(d)})
	get_news_bulk : function(data, callback){
		get_news_recursive(data.arr, 0, callback);
		//callback(false, 1)
	}
}
