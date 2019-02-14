"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
var SockJS = require("sockjs-client");
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
    ;
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
exports.VantiqSubscriber = VantiqSubscriber;
//# sourceMappingURL=vantiq-sock.js.map