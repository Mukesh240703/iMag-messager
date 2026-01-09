
const mongoose = require('mongoose');

// Shim for process.env (since we'll run with ts-node or similar, but let's just hardcode to test or load .env)
// Actually we can just require the lib/db? No, that's TS.
// Let's make a simple JS script using the URI from .env.local

const dotEnv = require('fs').readFileSync('.env.local', 'utf8');
const uri = dotEnv.split('\n').find(l => l.startsWith('MONGODB_URI=')).split('=')[1].trim();

console.log("Testing Connection to:", uri.substring(0, 15) + "...");

mongoose.connect(uri)
    .then(() => {
        console.log("Connected successfully!");
        // define simple User schema to test query
        const userSchema = new mongoose.Schema({ email: String, name: String, avatarUrl: String }, { strict: false });
        const User = mongoose.model('User', userSchema);
        return User.findOne();
    })
    .then(user => {
        console.log("Found User:", user ? user.email : "None");
        console.log("Avatar:", user ? user.avatarUrl : "N/A");
        process.exit(0);
    })
    .catch(err => {
        console.error("Connection Failed:", err);
        process.exit(1);
    });
