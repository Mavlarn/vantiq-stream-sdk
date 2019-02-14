import { AxiosPromise } from 'axios';
/**
 * Vantiq server options to create a new session.
 */
export interface VantiqOptions {
    server: string;
    apiVersion: number;
    accessToken: string;
}
/**
 * Http session for vantiq Rest API. Using axios to request to vantiq server.
 * This will be used by [[VantiqAPI]] and [[VantiqStream]]
 */
export declare class VantiqSession {
    private server;
    private apiVersion;
    private authenticated;
    private _accessToken;
    private _tokenHeader;
    private subscriber;
    private _axios;
    constructor(opts: VantiqOptions);
    isAuthenticated(): boolean;
    getServer(): string;
    getApiVersion(): number;
    authenticate(username: string, password: string): void;
    getAccessToken(): string | null;
    get(path: string): AxiosPromise;
    post(path: string, body: any): AxiosPromise<any>;
    put(path: string, body: any): AxiosPromise<any>;
    delete(path: string): AxiosPromise<any>;
    /**
     Issue a query request on a specific resource
     */
    select(resource: string, props: any, where: any, sort: any): AxiosPromise<any>;
    /**
     * Build a resource path for a vantiq resource.
     * @param qualifiedName resource name, like the name of a Type/source/procedure.s
     * @param id If the resource is a Type, id is the value of '_id' file or the resource
     */
    resourcePath(qualifiedName: string, id: string | null): string;
    /**
     * Build a api request path.
     * @param path the path.
     */
    private fullApiPath;
}
