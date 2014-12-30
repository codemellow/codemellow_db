/*
**************************
@author Park, ChunSeong
@created 2014-03-24
This Document is protected
**************************
*/

// var b = new Buffer(a).toString('base64');
// var c = new Buffer(b, 'base64').toString('ascii');

module.exports = {
  client: null,

  init: function(client){
    this.client = client;
  },

  /*
  this is elastic status module made by ChunSeong Park
  */
  elastic_status: function(callback){
    this.client.cluster.health(function (err, resp) {
      callback(err,resp)
    });
  },


  elastic_autocomplete: function(search_text, callback){
    this.client.suggest({
      index: 'repository',
      body: {
        project_autocomplete: {
          text: search_text,
          completion: {
            field: 'project_name_suggest'
          }
        }
      }
    }, function(err, response){
      console.log(err)
      
      if(err)
        throw err;
      if(callback)
        if(response.project_autocomplete){
          callback(response.project_autocomplete[0].options);
        }
    })
  },

  insert_new_repository: function(repository_id,repository_name, project_name, repository_description, date, thumbnail_url, callback){
    this.client.index({
      index:'repository',
      type:'cm_repository',
      id:repository_id,
      body:{
        repository_id:repository_id,
        repository_name: repository_name,
        project_name: project_name,
        repository_description: repository_description,
        create_date: date,
        last_commit_date:date,
        commit_count:0,
        release_count:0,
        contributor_count:0,
        review_count:0,
        review_point:0.0,
        repository_like_count:0,
        thumbnail_url: thumbnail_url,
        project_name_suggest: {
          input: [
            project_name
          ],
          output:repository_name
        }
      }
    },function (error, response) {
      if(callback){
        callback(error, response);
      }
    })
  },

  delete_repository: function(repository_name,project_discription,date,callback){
    this.client.delete({
      index:'repository',
      type:'cm_repository',
      id:repository_id
    },function (error, response) {
      if(callback){
        callback(error, response);
      }
    })
  },

  update_repository_last_commit_date: function(repository_id,date,callback){
    this.client.update({
      index: 'repository',
      type: 'cm_repository',
      id: repository_id,
      body: {
       last_commit_date:date
      }
    },function (error, response) {
      callback(error, response)
    });
  },
  update_repository_like_count: function(repository_id,value,callback){
    this.client.update({
      index: 'repository',
      type: 'cm_repository',
      id: repository_id,
      body: {
        script: 'ctx._source.repository_like_count += value',
        params : {
          "value" : value
        }
      }
    },function (error, response) {
      callback(error, response)
    });
  },
  update_repository_review_count: function(repository_id,value,callback){
    this.client.update({
      index: 'repository',
      type: 'cm_repository',
      id: repository_id,
      body: {
        script: 'ctx._source.review_count += value',
        params : {
          value : value
        }
      }
    },function (error, response) {
      callback(error, response)
    });
  },
  update_repository_review_point: function(repository_id,value,callback){
    this.client.update({
      index: 'repository',
      type: 'cm_repository',
      id: repository_id,
      body: {
        script: 'ctx._source.review_point += value',
        params : {
          value : value
        }
      }
    },function (error, response) {
      callback(error, response)
    });
  },
  update_repository_sell_count: function(repository_id,value,callback){
    this.client.update({
      index: 'repository',
      type: 'cm_repository',
      id: repository_id,
      body: {
        script: 'ctx._source.sell_count += value',
        params : {
          value : value
        }
      }
    },function (error, response) {
      callback(error, response)
    });
  },
  update_repository_sell_price: function(repository_id,value,callback){
    this.client.update({
      index: 'repository',
      type: 'cm_repository',
      id: repository_id,
      body: {
        script: 'ctx._source.sell_price += value',
        params : {
          value : value
        }
      }
    },function (error, response) {
      callback(error, response)
    });
  },
  update_repository_view_count: function(repository_id,value,callback){
    this.client.update({
      index: 'repository',
      type: 'cm_repository',
      id: repository_id,
      body: {
        script: 'ctx._source.view_count += value',
        params : {
          value : value
        }
      }
    },function (error, response) {
      callback(error, response)
    });
  },
  get_repository_id: function(repository_name,callback){
    this.client.search({
      index: 'repository',
      type:'cm_repository',
      body: {
        query: {
          term: {
            repository_name:repository_name 
          }
        }
      }
    },function (error, response) {
      console.log(response)
      callback(error, response) //not implemented yet
    });
  },

  search_code: function(page_num, search_text,callback){
    var size=12;
    var from=page_num*size;
    this.client.search({
      index: 'project',
      type:'code',
      from:from,
      size: size,
      body: {
        query: {
          term: {
            code:search_text 
          }
        }
      }
    },function (error, response) {
      callback(error, response)
    });
  },

 
  sort_search_repository: function(page_num, search_text, sort_option,callback){
    var size=12;
    var from=(page_num-1)*size;
    search_text = search_text.replace(/ +(?= )/g,'').trim(); //remove multiple whitespace and trim
    var keywordnum=search_text.split(" ").length
    var patt=new RegExp(/[~!\#$^&*\+|:;?"<,.>']/);
    var sort_body;

    if (sort_option=="rank"){
      sort_body=[
        { "rank" : {"order" : "desc"}},
        { "_score" : {"order" : "desc"}}
      ]
    }else if(sort_option=="date"){
      sort_body=[
        { "date" : {"order" : "desc"}},
        { "_score" : {"order" : "desc"}}
      ]

    }else{
      sort_body=[
        { "_score" : {"order" : "desc"}}
      ]
    }
    if(keywordnum<=1){ //single search keyword seperated by whitespace
      if(patt.test(search_text)){
        var single_keyword_body={
            "query": {
              "bool": {
                "should": [
                  {
                    "query_string": {
                      "project_name": {
                        "query": search_text,
                        "boost":1
                      }
                    }
                  },
                  {
                    "multi_match": {
                      "query": search_text,
                      "boost": 4,
                      "fields": [
                        "project_name^3",
                        "repository_description"
                      ]
                    }
                  },
                  {
                    "fuzzy": { 
                      "project_name": {
                        "value":search_text,
                        "fuzziness":1,
                        "boost": 0.5
                      }
                    }
                  }
                ],
                "minimum_number_should_match": 1
              }
            },
            "highlight" : {
                "number_of_fragments" : 3,
                "fragment_size" : 150,
                "tag_schema" : "styled",
                "fields" : {
                    "project_name" : { "pre_tags" : ["<highlight>"], "post_tags" : ["</highlight>"] },
                    "repository_description" : { "pre_tags" : ["<highlight>"], "post_tags" : ["</highlight>"] }
                }
            }
        };
        single_keyword_body.sort=sort_body;

        this.client.search({
          index: 'repository',
          type:'cm_repository',
          from:from,
          size: size,
          body: single_keyword_body
        },function (error, response) {
          callback(error, response)
        });
      }else{
        single_keyword_reg_body={
          "query": {
            "bool": {
              "should": [
                {
                  "query_string": {
                    "project_name": {
                      "query": search_text+"*",
                      "boost":1
                    }
                  }
                },
                {
                  "multi_match": {
                    "query": search_text,
                    "boost": 4,
                    "fields": [
                      "project_name^3",
                      "repository_description"
                    ]
                  }
                },
                {
                  "fuzzy": { 
                    "project_name": {
                      "value":search_text,
                      "fuzziness":1,
                      "boost": 0.5
                    }
                  }
                }
              ],
              "minimum_number_should_match": 1
            }
          },
          "highlight" : {
              "number_of_fragments" : 3,
              "fragment_size" : 150,
              "tag_schema" : "styled",
              "fields" : {
                  "project_name" : { "pre_tags" : ["<highlight>"], "post_tags" : ["</highlight>"] },
                  "repository_description" : { "pre_tags" : ["<highlight>"], "post_tags" : ["</highlight>"] }
              }
          }
        };
        single_keyword_reg_body.sort=sort_body;
        this.client.search({
        index: 'repository',
        type:'cm_repository',
        from:from,
        size: size,
        body: single_keyword_reg_body
      },function (error, response) {
        callback(error, response)
      });
      }
        
    }else{////multiple search keyword seperated by whitespace
      multiple_keyword_body={
          "query": {
            "bool": {
              "should": [
                {
                  "match_phrase_prefix": {
                    "project_name": {
                      "query": search_text,
                      "max_expansions": 5
                    }
                  }
                },
                {
                  "query_string": {
                    "project_name": {
                      "query": search_text.replace(/ /g,"*"),
                      "boost":0.2*keywordnum+1
                    }
                  }
                },
                  {"multi_match": {
                    "query": search_text,
                    "operator": "and",
                    "fields": [
                      "project_name^3",
                      "repository_description"
                    ]
                  }
                  },
                  {
                    "fuzzy": { 
                      "project_name": {
                        "value":search_text,
                        "fuzziness":keywordnum,
                        "boost": 0.5/keywordnum
                      }
                    }
                  }
              ],
              "minimum_number_should_match": 1
            }
          },
          "highlight" : {
              "number_of_fragments" : keywordnum,
              "fragment_size" : 150,
              "tag_schema" : "styled",
              "fields" : {
                  "project_name" : { "pre_tags" : ["<highlight>"], "post_tags" : ["</highlight>"] },
                  "repository_description" : { "pre_tags" : ["<highlight>"], "post_tags" : ["</highlight>"] }
              }
          }
      };
      multiple_keyword_body.sort=sort_body;
      this.client.search({
        index: 'repository',
        type:'cm_repository',
        from:from,
        size: size,
        body: multiple_keyword_body
      },function (error, response) {
        callback(error, response)
      });

    }
    
  }

}

