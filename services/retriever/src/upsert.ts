import { Request, Response } from "express";
import { pineconeUpsert } from "./pineconeClient";
export async function upsertHandler(req: Request, res: Response) {
  const ns = (process.env.PINECONE_NAMESPACE || "jenny_v1");
  const { records=[] } = req.body || {};
  await pineconeUpsert(records, ns);
  res.json({ ok: true, count: records.length });
}
