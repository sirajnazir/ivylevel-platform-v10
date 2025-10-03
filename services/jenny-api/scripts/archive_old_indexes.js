import { Pinecone } from '@pinecone-database/pinecone';
import { cfg } from '../src/config.js';
/*
 * Lists indexes and optionally deletes the two old ones by prefix.
 * Usage:  tsx scripts/archive_old_indexes.ts list
 *         tsx scripts/archive_old_indexes.ts delete NAME1 NAME2
 */
async function run() {
    const pc = new Pinecone({ apiKey: cfg.pinecone.apiKey });
    const cmd = process.argv[2] || 'list';
    if (cmd === 'list') {
        const ix = await pc.listIndexes();
        console.table(ix.indexes?.map((i) => ({ name: i.name, dimension: i.dimension, metric: i.metric })) || []);
        return;
    }
    if (cmd === 'delete') {
        const names = process.argv.slice(3);
        if (!names.length)
            throw new Error('Provide names to delete');
        for (const n of names) {
            console.log(`[delete] ${n}`);
            try {
                await pc.deleteIndex(n);
                console.log('[ok]');
            }
            catch (e) {
                console.error(`[fail] ${n}`, e);
            }
        }
        return;
    }
    throw new Error('Unknown cmd');
}
run().catch(e => { console.error(e); process.exit(1); });
