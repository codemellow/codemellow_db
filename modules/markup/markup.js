var spawn = require('child_process').spawn;
/*

apt-get install ruby1.9.3
apt-get install rubygems
apt-get purge ruby1.8
gem install github-markup
gem install redcarpet
gem install RedCloth
gem install rdoc -v 3.6.1
gem install org-ruby
gem install creole
gem install wikicloth
easy_install docutils
gem install asciidoctor
gem install rails

*/


exports.markup_parse = function(absolute_path,callback){
  	var markup_spawn=spawn('ruby',['markup.rb',absolute_path],{cwd:__dirname});
  	var stdout_data="";
	markup_spawn.stdout.on('data', function (data) {
		stdout_data+=data;
	});
	markup_spawn.stdout.on('end', function () {
		/*var first  = stdout_data.indexOf("\n");
		var next = stdout_data.indexOf("\n", first+1);
		stdout_data=stdout_data.substring(next+1,stdout_data.lastIndexOf("nil")-1)*/
		//console.log(stdout_data)
		callback(stdout_data);
	});
};

exports.markup_preview_parse = function(code_data,callback){
  	var markup_spawn=spawn('ruby',['markup_preview.rb'],{cwd:__dirname});
  	var stdout_data="";
	markup_spawn.stdout.on('data', function (data) {
		stdout_data+=data;
	});
	markup_spawn.stdin.write(code_data)
	markup_spawn.stdin.end();
	markup_spawn.stdout.on('end', function () {
		/*var first  = stdout_data.indexOf("\n");
		var next = stdout_data.indexOf("\n", first+1);
		stdout_data=stdout_data.substring(next+1,stdout_data.lastIndexOf("nil")-1)*/
		callback(stdout_data);
	});
};