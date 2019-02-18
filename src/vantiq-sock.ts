
import * as SockJS from 'sockjs-client';
import { VantiqOptions } from './vantiq-session';
import { connect } from 'tls';

/**
 * Subscriber class used to handle real-time subscription events from a Vantiq server.
 *
 */
export class VantiqSubscriber {

  private sockUrl: string;
  private accessToken: string;
  private sock: any;
  private callbacks: Map<string, Function>;
  private errCallback: Function | null;
  private wsauthenticated: boolean = false;
  private connection: Promise<boolean>;

  /**
   * Create a new vantiq Subscriber using Vantiq sock api.
   * @param opts Vantiq options.
   * @param errCb default error callback function.
   */
  public constructor(opts: VantiqOptions, errCb: Function) {
    this.callbacks = new Map<string, Function>();
    this.errCallback = errCb;
    this.accessToken = opts.accessToken;
    this.sockUrl = '';

    this.connection = this.connect(opts);
  }

  public isConnected() {
    return this.sock != null;
  }

  /**
   * Message handler for subscribed events.
   * @param m the message.
   */
  public handleMessage(m: any) {
    //
    // Lookup callback and issue request
    //
    var msg = JSON.parse(m);
    if ((msg.status == 200 || msg.status == 100) && msg.headers) {
      // for subscription, there will be an header to identify this request
      var requestId = msg.headers['X-Request-Id'];
      var callback  = this.callbacks.get(requestId);

      if(callback != null) {
        // for topics/sources subscription, the new topic/source data will be in msg.body.value.
        if (requestId.indexOf("/topics/") === 0 || requestId.indexOf("/sources/") === 0) {
          callback(msg.body.value);
        } else {
          callback(msg.body);
        }
      }
    } else if (msg.status == 200) {
      console.warn('There is no X-Request-Id in response:', msg);
    } else if (this.errCallback) {
      this.errCallback(msg);
    }
  };

  /**
   * Connect with vantiq sock api. This will return a promise. All sock api request should be after the
   * connection finished, using then() of this promise.
   * @param opts vantiq options.
   */
  public connect(opts: VantiqOptions): Promise<boolean> {
    return new Promise((resolve, reject) => {

        //
        // WebSocket URL: http[s]://host:port/api/v<apiVersion>/wsock/websocket
        //
      this.sockUrl = opts.server.replace('httpXXX', 'ws') + '/api/v' + opts.apiVersion + '/wsock';
      this.sock = new SockJS(this.sockUrl, null, { server: "websocket" });

      this.sock.onopen = () => {
          // Upon connection, we send an authentication request based on the
          // provided session access token to create an authenticated WS session.
          var auth = {
              op:           'validate',
              resourceName: 'users',
              object:       opts.accessToken
          };
          this.sock.send(JSON.stringify(auth));
      };

      this.sock.onmessage = (msg: any) => {
        //
        // We don't start handling subscription messages, until
        // we have established an authenticated WS session
        //
        if(this.wsauthenticated) {
            this.handleMessage(msg.data);
        } else {
            var resp = JSON.parse(msg.data);
            if(resp.status === 200) {
                this.wsauthenticated = true;
                resolve(true);
            } else {
                reject("Error establishing authenticated WebSocket session:\n" + JSON.stringify(resp, null, 2));
            }
        }
      };
      this.sock.onclose = (e: any) => {
          this.sock = null;
      };

    });
  }

  /**
   * Subscribe for an events.
   * @param path the path of the subscribed event.
   * @param cb callback function.
   */
  public subscribe(path: string, cb: Function | string): void {
    const thisRef = this;
    this.connection.then( (_: any) => {
      // Register callback based on path
      if(this.callbacks.get(path) != null) {
          throw new Error("Callback already registered for event: " + path);
      } else {
          this.callbacks.set(path, <Function>cb);
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
      this.sock.send(JSON.stringify(msg));
    });
  }

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
  public select(resourceName: string, parameters: any, cb: Function): void {
    const reqId = resourceName + "_" + new Date().getTime();
    const param = { requestId: reqId, ...parameters };
    const thisRef = this;
    this.connection.then( (_: any) => {
      if(this.callbacks.get(reqId) != null) {
          throw new Error("Callback already registered for event: " + reqId);
      } else {
          this.callbacks.set(reqId, cb);
      }
      var msg = {
          accessToken: thisRef.accessToken,
          op: 'select',
          resourceName: resourceName,
          resourceId: null,
          parameters: param
      };
      this.sock.send(JSON.stringify(msg));
    });
  }

  /**
   * CLose sock connection.
   */
  public close() {
    if(this.isConnected()) {
        this.sock.close();
    }
    this.sock = null;
  }
}





