import { VantiqSession, VantiqOptions } from './vantiq-session';
import { VantiqAPI } from './vantiq-api';
import { VantiqSubscriber } from './vantiq-sock';
import { AxiosResponse } from 'axios';

import { Subscription, Observable, Observer, Subject, interval } from 'rxjs';

// import fromPromise from 'rxjs';
/**
 * Vantiq stream util class to create a stream like we do in vantiq client builder.
 * Vantiq stream will use Rxjs to create a subscribable object, which will generate a stream-like
 * data.
 */
export class VantiqStream {

  private api: VantiqAPI;
  private session: VantiqSession;

  private streams: Map<String, Observable<any>> = new Map<string, Observable<any>>();

  public constructor(opts: VantiqOptions) {
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
  public timedQuery(streamName: string, typeName: string, intervalSec: number, where: any, limit: number, sort: any, onData: Function): Observable<any> {
    const subject = new Subject();
    const params: any = {};
    if (where) {
      params.where = where;
    }
    if (limit && limit > 0) {
      params.limit = limit;
    }
    if (sort) {
      params.sort = sort;
    }
    interval(intervalSec * 1000).subscribe((_: any) => {
      this.api.selectBySock(typeName, params, (data: any) => {
        subject.next(data);
        try {
          onData(data);
        } catch (e) {
          subject.error(e);
        }
      });
    })
    this.streams.set(streamName, subject);
    return subject;
  }

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
  public timedQueryWithRest(streamName: string, typeName: string, intervalSec: number, limit: number, where: any, sort: any, onData: Function): Observable<any> {
    const subject = new Subject();
    interval(intervalSec * 1000).subscribe((_: any) => {
      // resource: string, props: any, where: any, sort: any
      this.api.select(typeName, null, where, sort).then((data: any) => {
        subject.next(data);
        try {
          onData(data);
        } catch (e) {
          subject.error(e);
        }
      });
    });
    this.streams.set(streamName, subject);
    return subject;
  }

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
  public dataChanged(streamName: string, typeName: string, isInsert: boolean, isUpdate: boolean, isDelete: boolean, onData: Function) {
    const subject = new Subject();

    const _subscriberOnDate = (data: any) => {
      subject.next(data);
      try{
        onData(data);
      } catch(e) {
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
  }

  /**
   * Create a source event data stream. It will be used to receive s data stream from a Source.
   * If only the source has a `interval` setting, it will generate a data stream.
   *
   * @param streamName stream name.
   * @param sourceName name of the source.
   * @param onData callback function which will be called when the data is arrived.
   */
  public sourceEvent(streamName: string, sourceName: string, onData: Function): Observable<any> {
    const subject = new Subject();
    const _subscriberOnData = (data: any) => {
      subject.next(data);
      try{
        onData(data);
      } catch(e) {
        subject.error(e);
      }
    };

    this.api.subscribe("sources", sourceName, null, _subscriberOnData);
    this.streams.set(streamName, subject);
    return subject;
  }

  /**
   * Create a topic event stream. It will be used to get data from a topic.
   *
   * @param streamName stream name.
   * @param topicName name of the topic.
   * @param onData callback function which will be called when the data is arrived.
   */
  public topicEvent(streamName: string, topicName:string, onData: Function) {
    const subject = new Subject();
    const _subscriberOnData = (data: any) => {
      subject.next(data);
      try{
        onData(data);
      } catch(e) {
        subject.error(e);
      }
    };

    this.api.subscribe("topics", topicName, null, _subscriberOnData);
    this.streams.set(streamName, subject);
    return subject;
  }

  /**
   * Create a client event stream. It can be used in client side to trigger a data in this stream.
   *
   * @param streamName stream name.
   * @param onData callback function which will be called when the data is arrived.
   */
  public clientEvent(streamName: string, onData: Function): Observable<any> {
    const subject = new Subject();
    subject.subscribe( (data: any) => {
      try{
        onData(data);
      } catch(e) {
        subject.error(e);
      }
    })
    this.streams.set(streamName, subject);
    return subject;
  }
}
