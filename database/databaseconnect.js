const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = "mongodb+srv://salal:salal123@clastor1.r4vllie.mongodb.net/?retryWrites=true&w=majority&appName=clastor1";


function getClient() {
  return new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    }
  });
}
module.exports = getClient;