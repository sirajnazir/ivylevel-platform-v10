#!/usr/bin/env node
const fs = require('fs');
const path = process.argv[2] || '/tmp/jenny-unified.log';
const filter = process.argv[3]; // e.g. 'retriever' or 'trace:<id>'
require('readline')
  .createInterface({ input: fs.createReadStream(path) })
  .on('line', (line) => {
    try {
      const j = JSON.parse(line);
      if (!filter) return console.log(line);
      if (filter.startsWith('trace:')) {
        const id = filter.split(':')[1];
        if (j.trace_id === id) console.log(line);
      } else if (j.component === filter) {
        console.log(line);
      }
    } catch {}
  });