
/**
 * Module dependencies.
 */

var express = require('express');
var routes = require('./routes');
var user = require('./routes/user');
var http = require('http');
var path = require('path');
var app = express();
var pushover = require('pushover');
var repos_handler = require('./modules/repository/repository_handler');
var repos_manage = require('./modules/repository/repository_manage');
var elastic_search = require('./modules/elastic_search_handler/elastic_search');
var setting = require('./settings');
var default_repos_path = setting.data.default_repos_path;
var repos = pushover(default_repos_path,{autoCreate:true});
// all environments
app.set('port', process.env.PORT || 4000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.favicon());
// app.use(express.logger('dev'));
app.use(express.cookieParser());
app.use(express.bodyParser());
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));


// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/users', user.list);
app.post('/fork', routes.repository_fork);
app.post('/commit', routes.repository_commit);
app.post('/commit/count', routes.repository_commit_count);
app.post('/commit/list', routes.repository_commit_list);
app.post('/commit_diff', routes.commit_diff);
app.post('/branch/count', routes.repository_branch_count);
app.post('/new_project', routes.new_project);
app.post('/view/code', routes.view_file_code);
app.post('/view/readme', routes.get_readme_preview);
app.post('/view/dir', routes.view_dir);
app.post('/get_left_file_contents', routes.get_left_file_contents);
app.post('/history_of_file', routes.history_of_file);
app.get('/images/:image_base64', routes.image_load);
app.get('/archive/:user/:project', routes.git_archive_download);
app.post('/news', routes.news);
app.post('/news_bulk', routes.news_bulk);

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});

repos.default_repos_path = default_repos_path;
repos_handler.init(repos);
repos_manage.repos_init(repos, default_repos_path);

http.createServer(function (req, res) {
	repos.handle(req, res);
}).listen(7000);

elastic_search.elastic_init();