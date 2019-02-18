import { VantiqOptions } from './vantiq-session';
import { Observable, Subject } from 'rxjs';
/**
 * Vantiq stream util class to create a stream like we do in vantiq client builder.
 * Vantiq stream will use Rxjs to create a subscribable object, which will generate a stream-like
 * data.
 */
export declare class VantiqStream {
    private api;
    private session;
    private streams;
    constructor(opts: VantiqOptions);
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
     */
    timedQuery(streamName: string, typeName: string, intervalSec: number, where: any, limit: number, sort: any): Observable<any>;
    /**
     * Create a timed query stream, using Rest API.
     *
     * @param streamName stream name.
     * @param typeName name of the type.
     * @param intervalSec interval times in second.
     * @param where selection condition to get data.
     * @param limit result data limit count.
     * @param sort sort properties to sort during selection and result.
     */
    timedQueryWithRest(streamName: string, typeName: string, intervalSec: number, limit: number, where: any, sort: any): Observable<any>;
    /**
     * Create a data changed stream. It will be used get changed data from a `Type`.
     *
     * @param streamName stream name.
     * @param typeName name of the type.
     * @param isInsert whether to get inserted data.
     * @param isUpdate whether to get updated data.
     * @param isDelete whether to get deleted data.
     */
    dataChanged(streamName: string, typeName: string, isInsert: boolean, isUpdate: boolean, isDelete: boolean): Subject<{}>;
    /**
     * Create a source event data stream. It will be used to receive s data stream from a Source.
     * If only the source has a `interval` setting, it will generate a data stream.
     *
     * @param streamName stream name.
     * @param sourceName name of the source.
     */
    sourceEvent(streamName: string, sourceName: string): Observable<any>;
    /**
     * Create a topic event stream. It will be used to get data from a topic.
     *
     * @param streamName stream name.
     * @param topicName name of the topic.
     */
    topicEvent(streamName: string, topicName: string): Subject<{}>;
    /**
     * Create a client event stream. It can be used in client side to trigger a data in this stream.
     *
     * @param streamName stream name.
     *
     */
    clientEvent(streamName: string): Observable<any>;
    unsubscribeAll(): void;
}
