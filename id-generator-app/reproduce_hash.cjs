const crypto = require('crypto');

const INPUT = "112730";
const SALT = "IMIS_SECURE_LAYER_V1";
const TARGET_HASH_P1 = "e978ad50fe4a49ba104ecd5bae8130a3";
const TARGET_HASH_P2 = "921c56ceb615e4b270118ffd2f2675508";
const TARGET_HASH = TARGET_HASH_P1 + TARGET_HASH_P2;

console.log("Input:", INPUT);
console.log("Salt:", SALT);
console.log("Combined:", INPUT + SALT);

const hash = crypto.createHash('sha256').update(INPUT + SALT).digest('hex');
console.log("Generated Hash:", hash);
console.log("Target Hash:   ", TARGET_HASH);
console.log("Match?", hash === TARGET_HASH);

// Test empty space trimming hypothesis
const BAD_INPUT = "112730 ";
const badHash = crypto.createHash('sha256').update(BAD_INPUT.trim() + SALT).digest('hex');
console.log("Trimmed Bad Hash:", badHash);
console.log("Match Bad?", badHash === TARGET_HASH);
