import { VantiqAPI } from "../src/vantiq-api"

/**
 * Dummy test
 */
describe("Dummy test", () => {
  it("works if true is truthy", () => {
    expect(true).toBeTruthy()
  })

  it("DummyClass is instantiable", () => {
    const api = new VantiqAPI({
      server: "https://dev.vantiq.cn",
      accessToken: "NMrIV21OMjouawMjicUUd__EJFbhVWOiXHy8AdL2ojo=",
      apiVersion: 1
    });
    api.select("Sensor", null, null, null).then(data => {
      console.log(data);
      expect(data.length).toBe(99);
    });

    api.selectOne("Sensor", "5c4adaefbb88a35b4d76c9aa").then(data => {
      console.log(data);
      expect(parseInt(data.id)).toBe(1);
    });

    api.count("Sensor", null).then((data: any) => {
      console.log(data);
      expect(data).toBe(99);
    });

    api.subscribe("types", "Sensor", "update", (response: any) => {
      console.log(response);
      expect(true).toBe(true);
    });

    // { "where": { "timeZone": "Pacific" } }
    // {"id":{"$lt":"20"},"name":{"$ne":"sensor"}}
    // api.selectBySock("Sensor", { "where": { "id": 4 } }, (response: any) => {
    //   console.log(response);
    //   expect(response.length).toBe(1);
    //   expect(response[0].id).toBe(4);
    // });
    //try {
    api.selectBySock("Sensor", { "where": { "id": 3 } }, (response: any) => {
      console.log("select sensor sock:", response);
    });
  // } catch(e) {
  //   console.log(e);
  //   expect(true).toBeTruthy()
  // }
  })
});
