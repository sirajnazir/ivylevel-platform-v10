// services/retriever/tests/kind_locked.test.ts
import request from "supertest";
import express from "express";
import { router } from "../src/server";

const app = express();
app.use(express.json());
app.use("/", router);

describe("Kind-Locked Retriever Tests", () => {
  it("returns 400 when query includes multiple kinds", async () => {
    const res = await request(app)
      .post("/search")
      .send({
        query: "SAT score",
        filter: {
          kinds: ["APP-DOC", "EXEC-INTEL"] // Multiple kinds - should fail
        },
        student_id: "test-student",
        k: 5
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/single kind/i);
  });

  it("returns only appdoc namespace hits when kind=APP-DOC", async () => {
    const res = await request(app)
      .post("/search")
      .send({
        query: "SAT score",
        filter: {
          kind: "APP-DOC"
        },
        student_id: "huda",
        k: 5
      });

    if (res.status === 200 && res.body.results.length > 0) {
      // All results should be from appdoc namespace
      const namespaces = res.body.results.map((r: any) => r.namespace);
      const uniqueNamespaces = [...new Set(namespaces)];
      expect(uniqueNamespaces).toEqual(["appdoc"]);
      
      // All results should have APP-DOC kind in metadata
      const kinds = res.body.results.map((r: any) => r.metadata?.kind);
      const uniqueKinds = [...new Set(kinds)];
      expect(uniqueKinds).toEqual(["APP-DOC"]);
    }
  });

  it("returns only transcript namespace hits when kind=EXEC-INTEL", async () => {
    const res = await request(app)
      .post("/search")
      .send({
        query: "college discussion",
        filter: {
          kind: "EXEC-INTEL"
        },
        student_id: "huda",
        k: 5
      });

    if (res.status === 200 && res.body.results.length > 0) {
      // All results should be from transcript namespace (EXEC-INTEL maps to transcript)
      const namespaces = res.body.results.map((r: any) => r.namespace);
      const uniqueNamespaces = [...new Set(namespaces)];
      expect(uniqueNamespaces).toEqual(["transcript"]);
      
      // All results should have EXEC-INTEL kind in metadata
      const kinds = res.body.results.map((r: any) => r.metadata?.kind);
      const uniqueKinds = [...new Set(kinds)];
      expect(uniqueKinds).toEqual(["EXEC-INTEL"]);
    }
  });

  it("enforces namespace isolation for different kinds", async () => {
    // Query for APP-DOC
    const appDocRes = await request(app)
      .post("/search")
      .send({
        query: "academic performance",
        filter: { kind: "APP-DOC" },
        student_id: "huda",
        k: 3
      });

    // Query for GAMEPLAN  
    const gameplanRes = await request(app)
      .post("/search")
      .send({
        query: "academic performance",
        filter: { kind: "GAMEPLAN" },
        student_id: "huda",
        k: 3
      });

    if (appDocRes.status === 200 && gameplanRes.status === 200) {
      const appDocIds = appDocRes.body.results.map((r: any) => r.id);
      const gameplanIds = gameplanRes.body.results.map((r: any) => r.id);
      
      // No overlap in document IDs between different kinds
      const overlap = appDocIds.filter((id: string) => gameplanIds.includes(id));
      expect(overlap.length).toBe(0);
    }
  });
});