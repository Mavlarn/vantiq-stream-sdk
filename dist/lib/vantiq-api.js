"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
//
// Vantiq SDK Class
//
var vantiq_session_1 = require("./vantiq-session");
var vantiq_sock_1 = require("./vantiq-sock");
/**
 * Vantiq Rest api to interact with Vantiq server.
 */
var VantiqAPI = /** @class */ (function () {
    function VantiqAPI(opts) {
        this.session = new vantiq_session_1.VantiqSession(opts);
        this.subscriber = new vantiq_sock_1.VantiqSubscriber(opts, console.log);
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
    ;
    /**
     Issue a query request for a specific resource
     */
    VantiqAPI.prototype.selectOne = function (resource, id) {
        var path = this.session.resourcePath(resource, id);
        return this.session.get(path).then(function (response) {
            return response.data;
        });
    };
    ;
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
    ;
    /**
     Insert a new resource record
     */
    VantiqAPI.prototype.insert = function (resource, object) {
        var path = this.session.resourcePath(resource, null);
        return this.session.post(path, object)
            .then(this.processResult);
    };
    ;
    /**
     Update a resource that exists in the system
     */
    VantiqAPI.prototype.update = function (resource, id, object) {
        var path = this.session.resourcePath(resource, id);
        return this.session.put(path, object)
            .then(this.processResult);
    };
    ;
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
    ;
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
    ;
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
    ;
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
    ;
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
    ;
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
    ;
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
    ;
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
    ;
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
    ;
    /**
     Unsubscribes to all events.
     */
    VantiqAPI.prototype.unsubscribeAll = function () {
        this.subscriber.close();
        delete this.subscriber;
        console.log("this.subscriber");
        console.log(this.subscriber);
    };
    ;
    return VantiqAPI;
}());
exports.VantiqAPI = VantiqAPI;
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
;
//# sourceMappingURL=vantiq-api.js.map