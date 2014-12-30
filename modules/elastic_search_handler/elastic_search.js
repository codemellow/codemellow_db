
var elastic_search = require('elasticsearch');
var elastic_search_handler = require('./elastic_search_handler')
var elastic_search_autocomplete = require('./elastic_search_autocomplete');
var setting = require('../../settings');

module.exports = {
	client: null,
	//elastic_search_autocomplete host url must be changed too.
	elastic_init: function(){
		this.client = new elastic_search.Client({
			host: [setting.data.elastic_db_origin] //connect with multiple nodes
		});
		elastic_search_handler.init(this.client);
		elastic_search_autocomplete.init(this.client);
	},
}