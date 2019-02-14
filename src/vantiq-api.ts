//
// Vantiq SDK Class
//
import { VantiqSession, VantiqOptions } from './vantiq-session'
import { VantiqSubscriber } from './vantiq-sock'
import { AxiosResponse } from 'axios';

/**
 * Vantiq Rest api to interact with Vantiq server.
 */
export class VantiqAPI {

  private session: VantiqSession;
  private subscriber: VantiqSubscriber;

  public constructor (opts: VantiqOptions) {
    this.session = new VantiqSession(opts);
    this.subscriber = new VantiqSubscriber(opts, console.log);
  }

  /**
   Check if the session is authenticated.
   */
  public isAuthenticated() {
    return this.session.isAuthenticated();
  }

  /**
   * Authenticate with username and password.
   * @param username user name of vantiq
   * @param password password
   */
  public authenticate(username: string, password: string) {
    return this.session.authenticate(username, password);
  }

  public getSession() {
    return this.session;
  }

  public getSubscriber() {
    return this.subscriber;
  }

  /**
   Issue a query request for a resource, with query properties and sort.
   */
  select(resource: string, props: any, where: any, sort: any) {
    return this.session.select(resource, props, where, sort).then((response) => {
      return response.data;
    });
  };

  /**
   Issue a query request for a specific resource
   */
  selectOne(resource: string, id: string) {
    var path = this.session.resourcePath(resource, id);
    return this.session.get(path).then((response) => {
      return response.data;
    });
  };

  /**
   Issue a query request for a given resource but returns only the count
   */
  count(resource: string, where: any) {
    var path = this.session.resourcePath(resource, null) + '?count=true';
    if (where) {
      path += '&where=' + encodeURIComponent(JSON.stringify(where));
    }

    // Since we are only returning the count, we restrict
    // the query to just the IDs to minimize the data transmitted.
    path += '&props=' + encodeURIComponent(JSON.stringify(['_id']));

    return this.session.get(path)
      .then((result: AxiosResponse) => {
        return result.data.count;
      });
  };

  /**
   Insert a new resource record
   */
  insert(resource: string, object: object) {
    var path = this.session.resourcePath(resource, null);
    return this.session.post(path, object)
      .then(this.processResult);
  };

  /**
   Update a resource that exists in the system
   */
  update(resource: string, id: string, object: object) {
    var path = this.session.resourcePath(resource, id);
    return this.session.put(path, object)
      .then(this.processResult);
  };

  /**
   Upsert a resource.  If the resource already exists (as
   defined by a natural key), then update it.  Otherwise,
   insert a new record.
   */
  upsert(resource: string, object: any) {
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

  private processResult(response: AxiosResponse) {
    if (Array.isArray(response.data)) {
      if (response.data.length == 0) {
        return null;
      } else {
        return response.data[0];
      }
    } else {
      return response.data;
    }
  }

  /**
   Deletes a number of resource records that match the given where clause.
   */
  delete(resource: string, where: any) {
    var path = this.session.resourcePath(resource, null) + "?count=true&where=" + encodeURIComponent(JSON.stringify(where));
    return this.session.delete(path)
      .then((result) => {
        return (result.status == 204);
      });
  };

  /**
   Deletes a single resource record.
   */
  deleteOne(resource: string, id: string) {
    var path = this.session.resourcePath(resource, id);
    return this.session.delete(path)
      .then((result) => {
        return (result.status == 204);
      });
  };

  /**
   Publish onto a topic or a source
   */
  public publish(resource: string, id: string, payload: any) {

    // Only sources and topics support the publish operation
    if (resource != 'sources' && resource != 'topics') {
      return Promise.reject(new Error('Only "sources" and "topics" support publish'));
    }

    var path = '/resources/' + resource + '/' + id;
    return this.session.post(path, payload)
      .then((result) => {
        return (result.status == 200);
      })
      .catch((err) => {
        if (err.statusCode == 404 && resource == 'topics' && !id.startsWith('/')) {
          throw new Error("Illegal topic name.  Topic names must begin with a slash '/'.");
        } else {
          throw err;
        }
      });
  };

  /**
   Execute a specific procedure
   */
  public execute(procedure: string, params: any) {
    var path = '/resources/procedures/' + procedure;
    return this.session.post(path, params)
      .then((result) => {
        return result.data;
      });
  };

  /**
   Evaluate a specific analytics model
   */
  public evaluate(modelName: string, params: any) {
    var path = '/resources/analyticsmodels/' + modelName;
    return this.session.post(path, params)
      .then((result) => {
        return result.data;
      });
  };

  /**
   Query a specific source
   */
  public query(source: string, params: any) {
    var path = '/resources/sources/' + source + '/query';
    return this.session.post(path, params)
      .then((result) => {
        return result.data;
      });
  };

  /**
   Subscribe to a specific event.  The supported event types are:
   For topics, subscribe events are Simple "PUBLISH" events. The Path is the topic (e.g. "/foo/bar")
   For sources, subscribe events are Source events. Path is the source name.
   For types, subscribe events are changed Data Type events.  Path is the name and operation (e.g. "/MyType/insert")
   */
  subscribe(resource: string, name: string, operation: string | null, callback: Function | string) {
    let path;
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

  /**
   * Select data from vantiq using sock api.
   *
   * @param resourceName resource name.
   * @param parameters
   * @param callback callback function.
   */
  selectBySock(resourceName: string, parameters: any, callback: Function) {
    return this.subscriber.select(resourceName, parameters, callback);
  };

  /**
   Unsubscribes to all events.
   */
  unsubscribeAll() {
    this.subscriber.close();
    delete this.subscriber;
    console.log("this.subscriber");
    console.log(this.subscriber);
  };
}

/**
 Known Resources
 */
enum SYSTEM_RESOURCES {
  'users',
  'types',
  'namespaces',
  'profiles',
  'scalars',
  'documents',
  'sources',
  'topics',
  'rules',
  'nodes',
  'procedures',
  'analyticsmodels',
  'configurations'
};

