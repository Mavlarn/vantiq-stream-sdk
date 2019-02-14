(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('axios'), require('sockjs-client'), require('rxjs')) :
  typeof define === 'function' && define.amd ? define(['exports', 'axios', 'sockjs-client', 'rxjs'], factory) :
  (factory((global.vantiqStream = {}),global.axios,global.SockJS,global.rxjs));
}(this, (function (exports,axios,SockJS,rxjs) { 'use strict';

  axios = axios && axios.hasOwnProperty('default') ? axios['default'] : axios;

  var DEFAULT_API_VERSION = 1;
  /**
   * Http session for vantiq Rest API. Using axios to request to vantiq server.
   * This will be used by [[VantiqAPI]] and [[VantiqStream]]
   */
  var VantiqSession = /** @class */ (function () {
      function VantiqSession(opts) {
          this.authenticated = false;
          this.server = opts.server;
          this.apiVersion = 1;
          if (opts.apiVersion) {
              this.apiVersion = opts.apiVersion;
          }
          else {
              this.apiVersion = DEFAULT_API_VERSION;
          }
          if (!opts.accessToken) {
              throw new Error("Not authentication token!");
          }
          this._accessToken = opts.accessToken;
          this._tokenHeader = 'Bearer ' + this._accessToken;
          // Vantiq Subscriber used to listen to events
          this.subscriber = null;
          this._axios = axios.create({
              baseURL: this.server,
              timeout: 30000,
              headers: { 'Authorization': this._tokenHeader }
          });
      }
      VantiqSession.prototype.isAuthenticated = function () {
          return this.authenticated;
      };
      VantiqSession.prototype.getServer = function () {
          return this.server;
      };
      VantiqSession.prototype.getApiVersion = function () {
          return this.apiVersion;
      };
      VantiqSession.prototype.authenticate = function (username, password) {
          var _this = this;
          this._axios.get(this.fullApiPath('/authenticate'))
              .then(function (resp) {
              //
              // If access token is available, then we're authenticated
              //
              if (resp.status == 200 && resp.data && resp.data.accessToken) {
                  _this._accessToken = resp.data.accessToken;
                  _this.authenticated = true;
                  return true;
              }
              else {
                  _this._accessToken = null;
                  _this.authenticated = false;
                  return false;
              }
          });
      };
      VantiqSession.prototype.getAccessToken = function () {
          return this._accessToken;
      };
      VantiqSession.prototype.get = function (path) {
          return this._axios.get(this.fullApiPath(path));
      };
      VantiqSession.prototype.post = function (path, body) {
          return this._axios.post(this.fullApiPath(path), body);
      };
      VantiqSession.prototype.put = function (path, body) {
          return this._axios.put(this.fullApiPath(path), body);
      };
      VantiqSession.prototype.delete = function (path) {
          return this._axios.delete(this.fullApiPath(path));
      };
      /**
       Issue a query request on a specific resource
       */
      VantiqSession.prototype.select = function (resource, props, where, sort) {
          var path = this.resourcePath(resource, null);
          var join = '?';
          if (props) {
              path += join + 'props=' + encodeURIComponent(JSON.stringify(props));
              join = '&';
          }
          if (where) {
              path += join + 'where=' + encodeURIComponent(JSON.stringify(where));
              join = '&';
          }
          if (sort) {
              path += join + 'sort=' + encodeURIComponent(JSON.stringify(sort));
          }
          return this.get(path);
      };
      /**
       * Build a resource path for a vantiq resource.
       * @param qualifiedName resource name, like the name of a Type/source/procedure.s
       * @param id If the resource is a Type, id is the value of '_id' file or the resource
       */
      VantiqSession.prototype.resourcePath = function (qualifiedName, id) {
          var path;
          if (qualifiedName.startsWith("system.")) {
              var systemResourceName = qualifiedName.substring(7);
              path = "/resources/" + systemResourceName;
          }
          else {
              path = "/resources/custom/" + qualifiedName;
          }
          if (id != null) {
              path += "/" + id;
          }
          return path;
      };
      /**
       * Build a api request path.
       * @param path the path.
       */
      VantiqSession.prototype.fullApiPath = function (path) {
          if (path.startsWith('/')) {
              path = path.substring(1);
          }
          return '/api/v' + this.apiVersion + '/' + path;
      };
      return VantiqSession;
  }());

  /*! *****************************************************************************
  Copyright (c) Microsoft Corporation. All rights reserved.
  Licensed under the Apache License, Version 2.0 (the "License"); you may not use
  this file except in compliance with the License. You may obtain a copy of the
  License at http://www.apache.org/licenses/LICENSE-2.0

  THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
  KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
  WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
  MERCHANTABLITY OR NON-INFRINGEMENT.

  See the Apache Version 2.0 License for specific language governing permissions
  and limitations under the License.
  ***************************************************************************** */

  var __assign = function() {
      __assign = Object.assign || function __assign(t) {
          for (var s, i = 1, n = arguments.length; i < n; i++) {
              s = arguments[i];
              for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
          }
          return t;
      };
      return __assign.apply(this, arguments);
  };

  /**
   * Subscriber class used to handle real-time subscription events from a Vantiq server.
   *
   */
  var VantiqSubscriber = /** @class */ (function () {
      /**
       * Create a new vantiq Subscriber using Vantiq sock api.
       * @param opts Vantiq options.
       * @param errCb default error callback function.
       */
      function VantiqSubscriber(opts, errCb) {
          this.wsauthenticated = false;
          this.callbacks = new Map();
          this.errCallback = errCb;
          this.accessToken = opts.accessToken;
          this.sockUrl = '';
          this.connection = this.connect(opts);
      }
      VantiqSubscriber.prototype.isConnected = function () {
          return this.sock != null;
      };
      /**
       * Message handler for subscribed events.
       * @param m the message.
       */
      VantiqSubscriber.prototype.handleMessage = function (m) {
          //
          // Lookup callback and issue request
          //
          var msg = JSON.parse(m);
          if ((msg.status == 200 || msg.status == 100) && msg.headers) {
              // for subscription, there will be an header to identify this request
              var requestId = msg.headers['X-Request-Id'];
              var callback = this.callbacks.get(requestId);
              if (callback != null) {
                  // for topics/sources subscription, the new topic/source data will be in msg.body.value.
                  if (requestId.indexOf("/topics/") === 0 || requestId.indexOf("/sources/") === 0) {
                      callback(msg.body.value);
                  }
                  else {
                      callback(msg.body);
                  }
              }
          }
          else if (msg.status == 200) {
              console.warn('There is no X-Request-Id in response:', msg);
          }
          else if (this.errCallback) {
              this.errCallback(msg);
          }
      };
      /**
       * Connect with vantiq sock api. This will return a promise. All sock api request should be after the
       * connection finished, using then() of this promise.
       * @param opts vantiq options.
       */
      VantiqSubscriber.prototype.connect = function (opts) {
          var _this = this;
          return new Promise(function (resolve, reject) {
              //
              // WebSocket URL: http[s]://host:port/api/v<apiVersion>/wsock/websocket
              //
              _this.sockUrl = opts.server.replace('httpXXX', 'ws') + '/api/v' + opts.apiVersion + '/wsock';
              _this.sock = new SockJS(_this.sockUrl, null, { server: "websocket" });
              _this.sock.onopen = function () {
                  // Upon connection, we send an authentication request based on the
                  // provided session access token to create an authenticated WS session.
                  var auth = {
                      op: 'validate',
                      resourceName: 'users',
                      object: opts.accessToken
                  };
                  _this.sock.send(JSON.stringify(auth));
              };
              _this.sock.onmessage = function (msg) {
                  //
                  // We don't start handling subscription messages, until
                  // we have established an authenticated WS session
                  //
                  if (_this.wsauthenticated) {
                      _this.handleMessage(msg.data);
                  }
                  else {
                      var resp = JSON.parse(msg.data);
                      if (resp.status === 200) {
                          _this.wsauthenticated = true;
                          resolve(true);
                      }
                      else {
                          throw new Error("Error establishing authenticated WebSocket session:\n" + JSON.stringify(resp, null, 2));
                      }
                  }
              };
              _this.sock.onclose = function (e) {
                  _this.sock = null;
              };
          });
      };
      /**
       * Subscribe for an events.
       * @param path the path of the subscribed event.
       * @param cb callback function.
       */
      VantiqSubscriber.prototype.subscribe = function (path, cb) {
          var _this = this;
          var thisRef = this;
          this.connection.then(function (_) {
              // Register callback based on path
              if (_this.callbacks.get(path) != null) {
                  throw new Error("Callback already registered for event: " + path);
              }
              else {
                  _this.callbacks.set(path, cb);
              }
              // Issue request to create the subscription
              var msg = {
                  accessToken: thisRef.accessToken,
                  op: 'subscribe',
                  resourceName: 'events',
                  resourceId: path,
                  parameters: {
                      requestId: path
                  }
              };
              _this.sock.send(JSON.stringify(msg));
          });
      };
      /**
       * Select Types data by sock.
       * Although we can select data using Rest API, but sock api will not be limited b y CORS, and there
       *  will be no http connection for every requests. So we can use sock api to select Type data some times.
       *
       * @param resourceName type name.
       * @param parameters parameters for the selection. It should be like:
       * `{ "where": {"id":{"$lt":"20"}, "name":{"$ne":"sensor"}} }`
       * @param cb callback function for this selection.
       */
      VantiqSubscriber.prototype.select = function (resourceName, parameters, cb) {
          var _this = this;
          var reqId = resourceName + "_" + new Date().getTime();
          var param = __assign({ requestId: reqId }, parameters);
          var thisRef = this;
          this.connection.then(function (_) {
              if (_this.callbacks.get(reqId) != null) {
                  throw new Error("Callback already registered for event: " + reqId);
              }
              else {
                  _this.callbacks.set(reqId, cb);
              }
              var msg = {
                  accessToken: thisRef.accessToken,
                  op: 'select',
                  resourceName: resourceName,
                  resourceId: null,
                  parameters: param
              };
              _this.sock.send(JSON.stringify(msg));
          });
      };
      /**
       * CLose sock connection.
       */
      VantiqSubscriber.prototype.close = function () {
          if (this.isConnected()) {
              this.sock.close();
          }
          this.sock = null;
      };
      return VantiqSubscriber;
  }());

  //
  /**
   * Vantiq Rest api to interact with Vantiq server.
   */
  var VantiqAPI = /** @class */ (function () {
      function VantiqAPI(opts) {
          this.session = new VantiqSession(opts);
          this.subscriber = new VantiqSubscriber(opts, console.log);
      }
      /**
       Check if the session is authenticated.
       */
      VantiqAPI.prototype.isAuthenticated = function () {
          return this.session.isAuthenticated();
      };
      /**
       * Authenticate with username and password.
       * @param username user name of vantiq
       * @param password password
       */
      VantiqAPI.prototype.authenticate = function (username, password) {
          return this.session.authenticate(username, password);
      };
      VantiqAPI.prototype.getSession = function () {
          return this.session;
      };
      VantiqAPI.prototype.getSubscriber = function () {
          return this.subscriber;
      };
      /**
       Issue a query request for a resource, with query properties and sort.
       */
      VantiqAPI.prototype.select = function (resource, props, where, sort) {
          return this.session.select(resource, props, where, sort).then(function (response) {
              return response.data;
          });
      };
      /**
       Issue a query request for a specific resource
       */
      VantiqAPI.prototype.selectOne = function (resource, id) {
          var path = this.session.resourcePath(resource, id);
          return this.session.get(path).then(function (response) {
              return response.data;
          });
      };
      /**
       Issue a query request for a given resource but returns only the count
       */
      VantiqAPI.prototype.count = function (resource, where) {
          var path = this.session.resourcePath(resource, null) + '?count=true';
          if (where) {
              path += '&where=' + encodeURIComponent(JSON.stringify(where));
          }
          // Since we are only returning the count, we restrict
          // the query to just the IDs to minimize the data transmitted.
          path += '&props=' + encodeURIComponent(JSON.stringify(['_id']));
          return this.session.get(path)
              .then(function (result) {
              return result.data.length;
          });
      };
      /**
       Insert a new resource record
       */
      VantiqAPI.prototype.insert = function (resource, object) {
          var path = this.session.resourcePath(resource, null);
          return this.session.post(path, object)
              .then(this.processResult);
      };
      /**
       Update a resource that exists in the system
       */
      VantiqAPI.prototype.update = function (resource, id, object) {
          var path = this.session.resourcePath(resource, id);
          return this.session.put(path, object)
              .then(this.processResult);
      };
      /**
       Upsert a resource.  If the resource already exists (as
       defined by a natural key), then update it.  Otherwise,
       insert a new record.
       */
      VantiqAPI.prototype.upsert = function (resource, object) {
          var path = this.session.resourcePath(resource, null) + "?upsert=true";
          // Due to MongoDB issue, if the "_id" is present, then MongoDB
          // thinks the _id is being changed.  As such, we remove the
          // "_id" field if found.  This works if the resource has a natural
          // key defined.  If not, then likely updates are not desired.  If
          // an update is really desired, then the 'update' method should
          // be used.
          delete object._id;
          return this.session.post(path, object)
              .then(this.processResult);
      };
      VantiqAPI.prototype.processResult = function (response) {
          if (Array.isArray(response.data)) {
              if (response.data.length == 0) {
                  return null;
              }
              else {
                  return response.data[0];
              }
          }
          else {
              return response.data;
          }
      };
      /**
       Deletes a number of resource records that match the given where clause.
       */
      VantiqAPI.prototype.delete = function (resource, where) {
          var path = this.session.resourcePath(resource, null) + "?count=true&where=" + encodeURIComponent(JSON.stringify(where));
          return this.session.delete(path)
              .then(function (result) {
              return (result.status == 204);
          });
      };
      /**
       Deletes a single resource record.
       */
      VantiqAPI.prototype.deleteOne = function (resource, id) {
          var path = this.session.resourcePath(resource, id);
          return this.session.delete(path)
              .then(function (result) {
              return (result.status == 204);
          });
      };
      /**
       Publish onto a topic or a source
       */
      VantiqAPI.prototype.publish = function (resource, id, payload) {
          // Only sources and topics support the publish operation
          if (resource != 'sources' && resource != 'topics') {
              return Promise.reject(new Error('Only "sources" and "topics" support publish'));
          }
          var path = '/resources/' + resource + '/' + id;
          return this.session.post(path, payload)
              .then(function (result) {
              return (result.status == 200);
          })
              .catch(function (err) {
              if (err.statusCode == 404 && resource == 'topics' && !id.startsWith('/')) {
                  throw new Error("Illegal topic name.  Topic names must begin with a slash '/'.");
              }
              else {
                  throw err;
              }
          });
      };
      /**
       Execute a specific procedure
       */
      VantiqAPI.prototype.execute = function (procedure, params) {
          var path = '/resources/procedures/' + procedure;
          return this.session.post(path, params)
              .then(function (result) {
              return result.data;
          });
      };
      /**
       Evaluate a specific analytics model
       */
      VantiqAPI.prototype.evaluate = function (modelName, params) {
          var path = '/resources/analyticsmodels/' + modelName;
          return this.session.post(path, params)
              .then(function (result) {
              return result.data;
          });
      };
      /**
       Query a specific source
       */
      VantiqAPI.prototype.query = function (source, params) {
          var path = '/resources/sources/' + source + '/query';
          return this.session.post(path, params)
              .then(function (result) {
              return result.data;
          });
      };
      /**
       Subscribe to a specific event.  The supported event types are:
       For topics, subscribe events are Simple "PUBLISH" events. The Path is the topic (e.g. "/foo/bar")
       For sources, subscribe events are Source events. Path is the source name.
       For types, subscribe events are changed Data Type events.  Path is the name and operation (e.g. "/MyType/insert")
       */
      VantiqAPI.prototype.subscribe = function (resource, name, operation, callback) {
          var path;
          switch (resource) {
              case 'sources':
              case 'topics':
                  if (operation != null) {
                      return Promise.reject(new Error('Operation only supported for "types"'));
                  }
                  path = '/' + resource + '/' + name;
                  break;
              case 'types':
                  if (operation == null) {
                      return Promise.reject(new Error('Operation required for "types"'));
                  }
                  if (operation !== 'insert' &&
                      operation !== 'update' &&
                      operation !== 'delete') {
                      return Promise.reject(new Error('Operation must be "insert", "update" or "delete"'));
                  }
                  path = '/types/' + name + '/' + operation;
                  break;
              default:
                  return Promise.reject(new Error('Only "topics", "sources" and "types" support subscribe'));
          }
          return this.subscriber.subscribe(path, callback);
      };
      /**
       * Select data from vantiq using sock api.
       *
       * @param resourceName resource name.
       * @param parameters
       * @param callback callback function.
       */
      VantiqAPI.prototype.selectBySock = function (resourceName, parameters, callback) {
          return this.subscriber.select(resourceName, parameters, callback);
      };
      /**
       Unsubscribes to all events.
       */
      VantiqAPI.prototype.unsubscribeAll = function () {
          this.subscriber.close();
          delete this.subscriber;
          console.log("this.subscriber");
          console.log(this.subscriber);
      };
      return VantiqAPI;
  }());
  /**
   Known Resources
   */
  var SYSTEM_RESOURCES;
  (function (SYSTEM_RESOURCES) {
      SYSTEM_RESOURCES[SYSTEM_RESOURCES["users"] = 0] = "users";
      SYSTEM_RESOURCES[SYSTEM_RESOURCES["types"] = 1] = "types";
      SYSTEM_RESOURCES[SYSTEM_RESOURCES["namespaces"] = 2] = "namespaces";
      SYSTEM_RESOURCES[SYSTEM_RESOURCES["profiles"] = 3] = "profiles";
      SYSTEM_RESOURCES[SYSTEM_RESOURCES["scalars"] = 4] = "scalars";
      SYSTEM_RESOURCES[SYSTEM_RESOURCES["documents"] = 5] = "documents";
      SYSTEM_RESOURCES[SYSTEM_RESOURCES["sources"] = 6] = "sources";
      SYSTEM_RESOURCES[SYSTEM_RESOURCES["topics"] = 7] = "topics";
      SYSTEM_RESOURCES[SYSTEM_RESOURCES["rules"] = 8] = "rules";
      SYSTEM_RESOURCES[SYSTEM_RESOURCES["nodes"] = 9] = "nodes";
      SYSTEM_RESOURCES[SYSTEM_RESOURCES["procedures"] = 10] = "procedures";
      SYSTEM_RESOURCES[SYSTEM_RESOURCES["analyticsmodels"] = 11] = "analyticsmodels";
      SYSTEM_RESOURCES[SYSTEM_RESOURCES["configurations"] = 12] = "configurations";
  })(SYSTEM_RESOURCES || (SYSTEM_RESOURCES = {}));

  // import fromPromise from 'rxjs';
  /**
   * Vantiq stream util class to create a stream like we do in vantiq client builder.
   * Vantiq stream will use Rxjs to create a subscribable object, which will generate a stream-like
   * data.
   */
  var VantiqStream = /** @class */ (function () {
      function VantiqStream(opts) {
          this.streams = new Map();
          this.api = new VantiqAPI(opts);
          this.session = this.api.getSession();
      }
      /**
       * Create a timed query stream. It will be used to get data from a `Type`.
       * The parameters will be like this:
         ```
         {
           where: {"id":{"$lt":"20"},"name":{"$ne":"sensor"}}
           limit: 10,
           sort: {"name":1}
         }
         ```
       * The generated url will be like: `https://dev.vantiq.cn/api/v1/resources/custom/Sensor?where=%7B%22id%22%3A%7B%22%24lt%22%3A%2220%22%7D%2C%22name%22%3A%7B%22%24ne%22%3A%22sensor%22%7D%7D&limit=10&sort=%7B%22name%22%3A1%7D`
       *
       * @param streamName stream name.
       * @param typeName name of the type.
       * @param intervalSec interval times in second.
       * @param where selection condition to get data.
       * @param limit result data limit count.
       * @param sort sort properties to sort during selection and result.
       * @param onData callback function which will be called when the data is arrived.
       */
      VantiqStream.prototype.timedQuery = function (streamName, typeName, intervalSec, where, limit, sort, onData) {
          var _this = this;
          var subject = new rxjs.Subject();
          var params = {};
          if (where) {
              params.where = where;
          }
          if (limit && limit > 0) {
              params.limit = limit;
          }
          if (sort) {
              params.sort = sort;
          }
          rxjs.interval(intervalSec * 1000).subscribe(function (_) {
              _this.api.selectBySock(typeName, params, function (data) {
                  subject.next(data);
                  try {
                      onData(data);
                  }
                  catch (e) {
                      subject.error(e);
                  }
              });
          });
          this.streams.set(streamName, subject);
          return subject;
      };
      /**
       * Create a timed query stream, using Rest API.
       *
       * @param streamName stream name.
       * @param typeName name of the type.
       * @param intervalSec interval times in second.
       * @param where selection condition to get data.
       * @param limit result data limit count.
       * @param sort sort properties to sort during selection and result.
       * @param onData callback function which will be called when the data is arrived.
       */
      VantiqStream.prototype.timedQueryWithRest = function (streamName, typeName, intervalSec, limit, where, sort, onData) {
          var _this = this;
          var subject = new rxjs.Subject();
          rxjs.interval(intervalSec * 1000).subscribe(function (_) {
              // resource: string, props: any, where: any, sort: any
              _this.api.select(typeName, null, where, sort).then(function (data) {
                  subject.next(data);
                  try {
                      onData(data);
                  }
                  catch (e) {
                      subject.error(e);
                  }
              });
          });
          this.streams.set(streamName, subject);
          return subject;
      };
      /**
       * Create a data changed stream. It will be used get changed data from a `Type`.
       *
       * @param streamName stream name.
       * @param typeName name of the type.
       * @param isInsert whether to get inserted data.
       * @param isUpdate whether to get updated data.
       * @param isDelete whether to get deleted data.
       * @param onData callback function which will be called when the data is arrived.
       */
      VantiqStream.prototype.dataChanged = function (streamName, typeName, isInsert, isUpdate, isDelete, onData) {
          var subject = new rxjs.Subject();
          var _subscriberOnDate = function (data) {
              subject.next(data);
              try {
                  onData(data);
              }
              catch (e) {
                  subject.error(e);
              }
          };
          if (!isInsert && !isUpdate && !isDelete) {
              throw new Error("Error creating stream:" + streamName);
          }
          if (isInsert) {
              this.api.subscribe("types", typeName, "insert", _subscriberOnDate);
          }
          if (isUpdate) {
              this.api.subscribe("types", typeName, "update", _subscriberOnDate);
          }
          if (isDelete) {
              this.api.subscribe("types", typeName, "delete", _subscriberOnDate);
          }
          this.streams.set(streamName, subject);
          return subject;
      };
      /**
       * Create a source event data stream. It will be used to receive s data stream from a Source.
       * If only the source has a `interval` setting, it will generate a data stream.
       *
       * @param streamName stream name.
       * @param sourceName name of the source.
       * @param onData callback function which will be called when the data is arrived.
       */
      VantiqStream.prototype.sourceEvent = function (streamName, sourceName, onData) {
          var subject = new rxjs.Subject();
          var _subscriberOnData = function (data) {
              subject.next(data);
              try {
                  onData(data);
              }
              catch (e) {
                  subject.error(e);
              }
          };
          this.api.subscribe("sources", sourceName, null, _subscriberOnData);
          this.streams.set(streamName, subject);
          return subject;
      };
      /**
       * Create a topic event stream. It will be used to get data from a topic.
       *
       * @param streamName stream name.
       * @param topicName name of the topic.
       * @param onData callback function which will be called when the data is arrived.
       */
      VantiqStream.prototype.topicEvent = function (streamName, topicName, onData) {
          var subject = new rxjs.Subject();
          var _subscriberOnData = function (data) {
              subject.next(data);
              try {
                  onData(data);
              }
              catch (e) {
                  subject.error(e);
              }
          };
          this.api.subscribe("topics", topicName, null, _subscriberOnData);
          this.streams.set(streamName, subject);
          return subject;
      };
      /**
       * Create a client event stream. It can be used in client side to trigger a data in this stream.
       *
       * @param streamName stream name.
       * @param onData callback function which will be called when the data is arrived.
       */
      VantiqStream.prototype.clientEvent = function (streamName, onData) {
          var subject = new rxjs.Subject();
          subject.subscribe(function (data) {
              try {
                  onData(data);
              }
              catch (e) {
                  subject.error(e);
              }
          });
          this.streams.set(streamName, subject);
          return subject;
      };
      return VantiqStream;
  }());

  exports.VantiqSession = VantiqSession;
  exports.VantiqAPI = VantiqAPI;
  exports.VantiqSubscriber = VantiqSubscriber;
  exports.VantiqStream = VantiqStream;

  Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=vantiq-stream.umd.js.map
