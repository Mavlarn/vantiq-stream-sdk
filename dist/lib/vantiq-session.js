"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var axios_1 = require("axios");
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
        this._axios = axios_1.default.create({
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
        var credentials = { username: username, password: password };
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
    ;
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
    ;
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
    ;
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
exports.VantiqSession = VantiqSession;
//# sourceMappingURL=vantiq-session.js.map