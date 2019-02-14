import axios, { AxiosPromise, AxiosResponse, AxiosInstance } from 'axios';

import { VantiqSubscriber } from './vantiq-sock'

const DEFAULT_API_VERSION = 1;

/**
 * Vantiq server options to create a new session.
 */
export interface VantiqOptions {
  server: string,
  apiVersion: number,
  accessToken: string
}

/**
 * Http session for vantiq Rest API. Using axios to request to vantiq server.
 * This will be used by [[VantiqAPI]] and [[VantiqStream]]
 */
export class VantiqSession {

  private server: string;
  private apiVersion: number;
  private authenticated: boolean = false;

  private _accessToken: string | null;
  private _tokenHeader: string;
  private subscriber: VantiqSubscriber | null;

  private _axios: AxiosInstance;

  public constructor(opts: VantiqOptions) {
    this.server        = opts.server;
    this.apiVersion    = 1;

    if(opts.apiVersion) {
        this.apiVersion = opts.apiVersion;
    } else {
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
      headers: {'Authorization': this._tokenHeader}
    });
  }

  public isAuthenticated () {
    return this.authenticated;
  }

  public getServer() {
    return this.server;
  }

  public getApiVersion() {
    return this.apiVersion;
  }

  public authenticate (username: string, password: string) {
    var credentials =  { username: username, password: password };
    this._axios.get(this.fullApiPath('/authenticate'))
        .then((resp: AxiosResponse) => {
            //
            // If access token is available, then we're authenticated
            //
            if(resp.status == 200 && resp.data && resp.data.accessToken) {
                this._accessToken   = resp.data.accessToken;
                this.authenticated = true;
                return true;
            } else {
                this._accessToken   = null;
                this.authenticated = false;
                return false;
            }
        });
  };

  public getAccessToken() {
    return this._accessToken;
  }

  public get(path: string): AxiosPromise {
    return this._axios.get(this.fullApiPath(path));
  }

  public post(path: string, body: any) {
    return this._axios.post(this.fullApiPath(path), body);
  }

  public put(path: string, body: any) {
    return this._axios.put(this.fullApiPath(path), body);
  }

  public delete(path: string) {
    return this._axios.delete(this.fullApiPath(path));
  }

  /**
   Issue a query request on a specific resource
   */
  select(resource: string, props: any, where: any, sort: any) {
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
  public resourcePath(qualifiedName: string, id: string | null) {
    let path;
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
  private fullApiPath(path: string): string {
    if(path.startsWith('/')) {
        path = path.substring(1);
    }
    return '/api/v' + this.apiVersion + '/' + path;
  }
}
