import { VantiqSession, VantiqOptions } from './vantiq-session';
import { VantiqSubscriber } from './vantiq-sock';
/**
 * Vantiq Rest api to interact with Vantiq server.
 */
export declare class VantiqAPI {
    private session;
    private subscriber;
    constructor(opts: VantiqOptions);
    /**
     Check if the session is authenticated.
     */
    isAuthenticated(): boolean;
    /**
     * Authenticate with username and password.
     * @param username user name of vantiq
     * @param password password
     */
    authenticate(username: string, password: string): void;
    getSession(): VantiqSession;
    getSubscriber(): VantiqSubscriber;
    /**
     Issue a query request for a resource, with query properties and sort.
     */
    select(resource: string, props: any, where: any, sort: any): Promise<any>;
    /**
     Issue a query request for a specific resource
     */
    selectOne(resource: string, id: string): Promise<any>;
    /**
     Issue a query request for a given resource but returns only the count
     */
    count(resource: string, where: any): Promise<any>;
    /**
     Insert a new resource record
     */
    insert(resource: string, object: object): Promise<any>;
    /**
     Update a resource that exists in the system
     */
    update(resource: string, id: string, object: object): Promise<any>;
    /**
     Upsert a resource.  If the resource already exists (as
     defined by a natural key), then update it.  Otherwise,
     insert a new record.
     */
    upsert(resource: string, object: any): Promise<any>;
    private processResult;
    /**
     Deletes a number of resource records that match the given where clause.
     */
    delete(resource: string, where: any): Promise<boolean>;
    /**
     Deletes a single resource record.
     */
    deleteOne(resource: string, id: string): Promise<boolean>;
    /**
     Publish onto a topic or a source
     */
    publish(resource: string, id: string, payload: any): Promise<boolean>;
    /**
     Execute a specific procedure
     */
    execute(procedure: string, params: any): Promise<any>;
    /**
     Evaluate a specific analytics model
     */
    evaluate(modelName: string, params: any): Promise<any>;
    /**
     Query a specific source
     */
    query(source: string, params: any): Promise<any>;
    /**
     Subscribe to a specific event.  The supported event types are:
     For topics, subscribe events are Simple "PUBLISH" events. The Path is the topic (e.g. "/foo/bar")
     For sources, subscribe events are Source events. Path is the source name.
     For types, subscribe events are changed Data Type events.  Path is the name and operation (e.g. "/MyType/insert")
     */
    subscribe(resource: string, name: string, operation: string | null, callback: Function | string): void | Promise<never>;
    /**
     * Select data from vantiq using sock api.
     *
     * @param resourceName resource name.
     * @param parameters
     * @param callback callback function.
     */
    selectBySock(resourceName: string, parameters: any, callback: Function): void;
    /**
     Unsubscribes to all events.
     */
    unsubscribeAll(): void;
}
