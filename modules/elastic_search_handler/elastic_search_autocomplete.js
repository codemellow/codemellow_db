var elastic_search = require('elasticsearch');
var elastic_search_handler = require('./elastic_search_handler')
var settings = require('../../settings')
module.exports = {
	client: null,

	init: function(client){
		var self = this;
		this.client = client;
		this.init_mapsetting();
	},

	/*init_create: function(){
		var self = this;
		this.client.create({
			index: 'repository',
			type: 'cm_repository',
			id: '1',
			body: {

			}
		},function(err){
			if(err)
				throw err
			self.init_mapsetting();
		})
		//after update to exec(curl)..	
	},*/

	init_mapsetting: function(){
		var self = this;
		var myMappingApi={
			putMyMapping:function(params,cb){
				this.transport.request(params,function(err, resp, status){
					cb(err, resp, status);
				})
			}
		};
		elastic_search.Client.apis.mine=myMappingApi;
		var mapclient=new elastic_search.Client({apiVersion:'mine',host: [settings.data.elastic_db_origin]});
		mapclient.putMyMapping({
				method:'PUT',
				path:'/repository/',
				body:{
					"mappings":{
					    "cm_repository": {
							"properties": {
								"repository_id": {
					               "type": "string"
					            },
					            "repository_name": {
					               "type": "string"
					            },
					            "project_name": {
					               "type": "string","store":"yes","term_vector":"with_positions_offsets"
					            },
					            "repository_description": {
					               "type": "string","store":"yes","term_vector":"with_positions_offsets"
					            }, 
					            "create_date": {
					               "type": "string"
					            },
					            "last_commit_date": {
					               "type": "string"
					            },
					            "commit_count": {
					               "type": "integer"
					            },
					            "sell_count": {
					               "type": "integer"
					            },
					            "sell_price": {
					               "type": "integer"
					            },
					            "view_count": {
			                       "type": "integer"
			                    },
					            "release_count": {
					               "type": "integer"
					            },
					            "contributor_count": {
					               "type": "integer"
					            },
					            "thumbnail_url":{
					            	"type":"string"
					            },
					            "review_count": {
					               "type": "integer"
					            },
					            "review_point": {
					               "type": "double"
					            },
					            "repository_like_count": {
					               "type": "integer"
					            },
					            "project_name_suggest": {
					               "type": "completion",
					               "index_analyzer": "simple",
					               "search_analyzer": "simple",
					               "payloads": false
					            }
							}
					    }
					}
				}
		}, function(err, resp, status){
			if(err)
				console.log('elastic mapping error : map index already exist')
		});
	},

	autocomplete: function(req, res){

		var text = req.body.msg;
		console.log(text)
		elastic_search_handler.elastic_autocomplete(text, function(data){
			console.log(data)
			if(data.length > 100)
				result = data.splice(0, 100);
			else
				result = data;
			res.json(result);
		});
	}
}