import { VantiqOptions } from './vantiq-session';
/**
 * Subscriber class used to handle real-time subscription events from a Vantiq server.
 *
 */
export declare class VantiqSubscriber {
    private sockUrl;
    private accessToken;
    private sock;
    private callbacks;
    private errCallback;
    private wsauthenticated;
    private connection;
    /**
     * Create a new vantiq Subscriber using Vantiq sock api.
     * @param opts Vantiq options.
     * @param errCb default error callback function.
     */
    constructor(opts: VantiqOptions, errCb: Function);
    isConnected(): boolean;
    /**
     * Message handler for subscribed events.
     * @param m the message.
     */
    handleMessage(m: any): void;
    /**
     * Connect with vantiq sock api. This will return a promise. All sock api request should be after the
     * connection finished, using then() of this promise.
     * @param opts vantiq options.
     */
    connect(opts: VantiqOptions): Promise<boolean>;
    /**
     * Subscribe for an events.
     * @param path the path of the subscribed event.
     * @param cb callback function.
     */
    subscribe(path: string, cb: Function | string): void;
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
    select(resourceName: string, parameters: any, cb: Function): void;
    /**
     * CLose sock connection.
     */
    close(): void;
}
