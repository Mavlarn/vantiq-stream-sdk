# Vantiq Stream SDK

Vantiq stream SDK using in browser. It provides API to create stream like we did in Vantiq client builder. And it also provides javascript API to interact with vantiq server.

## Usage

### Install
Run npm install to install this sdk in your web app
```bash
npm install vantiq-stream
```

### Import
If you are using Angular or other similar framework, you can import the SDK just with:
```
import { VantiqAPI } from "../src/vantiq-api"
import { VantiqStream } from "../src/vantiq-stream"
```
### Using Rest API
You can use `VantiqAPI` to interact with vantiq server using Rest API. Like:
```javascript
    const api = new VantiqAPI({
      server: "https://dev.vantiq.cn",
      accessToken: "<YOUR_ACCESS_TOKEN>",
      apiVersion: 1
    });
    api.select("Sensor", null, null, null).then(data => {
      // process with data
    });

    api.selectOne("Sensor", "5c4adaefbb88a35b4d76c9aa").then(data => {
      // process with data}
    });

    api.count("Sensor", null).then((data: any) => {
      // process with data
    });

    api.subscribe("types", "Sensor", "update", (response: any) => {
      // process with response
    });
```
### Create stream
You can use `VantiqStream` to create a stream.
```javascript
// create a timed query stream.
const whereParam = { id: { "$lt": 5 }};
const sensorStream = streamApi.timedQuery("tq_sensorStream", "Sensor", 10, whereParam, null, null).subscribe((data) => {
  // process data
});

```
If you need to stop getting data, you can `unsubscribe()`:
```javascript
sensorStream.unsubscribe();
```

Now we can create stream for:
 * timed query
 * data changed
 * source event data
 * topic event data
 * client event
 