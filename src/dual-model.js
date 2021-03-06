var bb = require('backbone');
var IDBModel = require('../backbone-idb/src/idb-model');
var _ = require('lodash');

module.exports = bb.DualModel = IDBModel.extend({

  idAttribute: 'local_id',

  remoteIdAttribute: 'id',

  url: function(){
    var remoteId = this.get(this.remoteIdAttribute),
        urlRoot = _.result(this.collection, 'url');

    if(remoteId){
      return '' + urlRoot + '/' + remoteId + '/';
    }
    return urlRoot;
  },

  sync: function( method, model, options ){
    options = options || {};
    this.setLocalState( method );
    if( options.remote ){
      return this.remoteSync( method, model, options );
    }
    return bb.sync.call( this, method, model, options );
  },

  remoteSync: function( method, model, options ){
    var self = this, opts = _.extend({}, options, {
      remote: false,
      success: false
    });
    return bb.sync.call( this, method, model, opts )
      .then( function( resp ){
        resp = options.parse ? model.parse(resp, options) : resp;
        model.set( resp );
        var remoteMethod = self.getRemoteMethod();
        opts.remote = true;
        return bb.sync.call( self, remoteMethod, model, opts );
      })
      .then( function( resp ){
        resp = options.parse ? model.parse(resp, options) : resp;
        resp = _.extend( {}, resp, { _state: undefined } );
        model.set( resp );
        opts.remote = false;
        opts.success = options.success;
        return bb.sync.call( self, 'update', model, opts );
      });
  },

  setLocalState: function( method ){
    method = method === 'patch' ? 'update' : method;
    if( method === 'update' && !this.hasRemoteId() ){
      method = 'create';
    }
    if( method === 'create' && this.hasRemoteId() ){
      method = 'update';
    }
    this.set({ _state: this.collection.states[method] });
  },

  getRemoteMethod: function(){
    return _.invert( this.collection.states )[ this.get('_state') ];
  },

  hasRemoteId: function() {
    return !!this.get( this.remoteIdAttribute );
  },

  toJSON: function( options ){
    options = options || {};
    var json = IDBModel.prototype.toJSON.apply( this, arguments );
    if( options.remote && this.name ) {
      var nested = {};
      nested[this.name] = json;
      return nested;
    }
    return json;
  },

  parse: function( resp, options ) {
    resp = resp && resp[this.name] ? resp[this.name] : resp;
    return IDBModel.prototype.parse.call( this, resp, options );
  }

});