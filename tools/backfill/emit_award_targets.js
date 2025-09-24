"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const node_fetch_1 = require("node-fetch");
const API = process.env.API || "http://localhost:4000";
const SRC = "../../data/canonical/jenny-huda/01-Intelligence-GamePlan";
const targets = [
    "NCWIT",
    "JCamp",
    "Girls Who Code",
    "Kode with Klossy",
    "AP Scholar",
    "National Merit",
    "Regeneron",
    "HMC Math",
    "AIME",
    "USACO"
];
async function main() {
    const srcPath = SRC.startsWith('/') ? SRC : `${process.cwd()}/${SRC}`;
    if (!fs.existsSync(srcPath)) {
        console.error(`Directory not found: ${srcPath}`);
        console.log("Looking for GamePlan files in alternative locations...");
        // Try alternative paths
        const altPaths = [
            "data/raw/jenny-huda/01-Intelligence-GamePlan",
            "data/processed/jenny-huda/01-Intelligence-GamePlan"
        ];
        for (const alt of altPaths) {
            const altPath = `${process.cwd()}/${alt}`;
            if (fs.existsSync(altPath)) {
                console.log(`Found GamePlan at: ${altPath}`);
                return processDirectory(altPath);
            }
        }
        console.error("Could not find GamePlan directory");
        process.exit(1);
    }
    return processDirectory(srcPath);
}
async function processDirectory(dirPath) {
    const files = fs.readdirSync(dirPath).filter(f => f.endsWith(".json"));
    const found = new Set();
    console.log(`Processing ${files.length} files in ${dirPath}`);
    for (const f of files) {
        try {
            const doc = JSON.parse(fs.readFileSync(path.join(dirPath, f), 'utf8'));
            const text = (doc.text || "").toLowerCase();
            for (const target of targets) {
                if (text.includes(target.toLowerCase())) {
                    found.add(target);
                    console.log(`  Found "${target}" in ${f}`);
                }
            }
        }
        catch (error) {
            console.warn(`Failed to parse ${f}:`, error);
        }
    }
    if (found.size === 0) {
        console.log("No award targets found in text. Adding default targets from spec.");
        // Add known targets from the spec
        ["NCWIT", "JCamp", "AP Scholar", "Girls Who Code", "Kode with Klossy"].forEach(t => found.add(t));
    }
    try {
        const response = await (0, node_fetch_1.default)(`${API}/observe`, {
            method: "POST",
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                studentId: "huda",
                kind: "AWARD",
                subtype: "targets",
                value: { targets: [...found] },
                source: "gameplan",
                at: "2023-08-01" // Week 1 timeframe
            })
        });
        const result = await response.json();
        console.log(result.ok ? "\n✓ Posted award targets" : "\n✗ Failed to post award targets");
    }
    catch (error) {
        console.error("Error posting targets:", error);
    }
    console.log(`\nEmitted targets: ${[...found].join(", ")}`);
}
main().catch(console.error);
