import { Pinecone } from "@pinecone-database/pinecone";
import { OpenAI } from "openai";

const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

async function getEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  return response.data[0].embedding;
}

async function populateTestData() {
  const index = pc.index("jenny-v2");
  
  const testData = [
    // APP-DOC data
    {
      namespace: "appdoc",
      id: "huda-app-sat-1",
      text: "SAT Score: 1530 (Math: 780, EBRW: 750). Submitted to all colleges. First attempt was 1480, final score 1530 shows strong improvement.",
      metadata: {
        kind: "APP-DOC",
        student: "huda",
        student_id: "huda",
        title: "Test Scores - SAT",
        doc_name: "CommonApp_TestScores.pdf",
        week: 65
      }
    },
    {
      namespace: "appdoc",
      id: "huda-app-awards-1",
      text: "Awards: NCWIT National Runner Up, Science Olympiad State Gold Medal, Academic Decathlon Regional Champion",
      metadata: {
        kind: "APP-DOC", 
        student: "huda",
        student_id: "huda",
        title: "Awards and Honors",
        doc_name: "CommonApp_Awards.pdf",
        week: 65
      }
    },
    // EXEC-INTEL data
    {
      namespace: "transcript",
      id: "huda-exec-w057-1",
      text: "Week 57 execution plan: Focus on SAT prep final push, complete MIT essays first draft, schedule Columbia interview",
      metadata: {
        kind: "EXEC-INTEL",
        student: "huda",
        student_id: "huda",
        title: "Weekly Execution Plan W057",
        doc_name: "exec_intel_w057.txt",
        week: 57
      }
    },
    // TRANS-INTEL data
    {
      namespace: "transcript",
      id: "huda-trans-ncwit-1",
      text: "Jenny: Amazing news - you're NCWIT National Runner Up! This is huge for MIT and Stanford. Huda: I can't believe it! Should I update all my apps?",
      metadata: {
        kind: "TRANS-INTEL",
        student: "huda",
        student_id: "huda",
        title: "Session Transcript - NCWIT Celebration",
        doc_name: "transcript_2024-12-15.txt",
        week: 64
      }
    }
  ];

  console.log("Populating test data...");
  
  for (const item of testData) {
    const embedding = await getEmbedding(item.text);
    
    await index.namespace(item.namespace).upsert([{
      id: item.id,
      values: embedding,
      metadata: item.metadata
    }]);
    
    console.log(`✓ Inserted ${item.id} into ${item.namespace} namespace`);
  }
  
  console.log("\nDone! Populated test data for retriever testing.");
}

populateTestData().catch(console.error);