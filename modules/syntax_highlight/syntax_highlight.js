var spawn = require('child_process').spawn;
/*
sudo apt-get install python-pip
sudo pip install pygments

*/


exports.syntax_parse = function(absolute_path,callback){
  	var syntax_spawn=spawn('python',['syntax.py',absolute_path],{cwd:__dirname});
  	var stdout_data="";
  	var err_data;
	syntax_spawn.stdout.on('data', function (data) {
		stdout_data+=data;
	});
	syntax_spawn.stdout.on('end', function () {
		//var first  = stdout_data.indexOf("\n");
		//var next = stdout_data.indexOf("\n", first+1);
		//stdout_data=stdout_data.substring(next+1,stdout_data.lastIndexOf("nil")-1)
		callback(stdout_data);
	});
	// syntax_spawn.on('error', function (e){
	// 	console.log('error', e);
	// })
	syntax_spawn.stderr.on('data', function(e){
		err_data+=e;
	})
};