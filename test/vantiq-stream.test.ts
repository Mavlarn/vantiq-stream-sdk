import { VantiqStream } from "../src/vantiq-stream"

/**
 * Dummy test
 */
describe("VantiqStream test", () => {
  it("works if true is truthy", () => {
    expect(true).toBeTruthy()
  })

  it("VantiqStream is instantiable", () => {

    const stream = new VantiqStream({
      server: "https://dev.vantiq.cn",
      accessToken: "NMrIV21OMjouawMjicUUd__EJFbhVWOiXHy8AdL2ojo=",
      apiVersion: 1
    });

    // stream.
    const subs$ = stream.timedQuery("tq_sensorStream", "Sensor", 1, { id: {'$lt': 5 }}, 2, null).subscribe((data: any) => {
      console.log("data:", data);
      expect(data.length).toBe(2);
    });
  })
})
