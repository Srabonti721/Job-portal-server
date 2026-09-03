const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config()
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.efzq5bn.mongodb.net/?appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});
client.connect().catch(console.dir);
const jobsCollections = client.db("JobPortal").collection("Jobs");

app.get("/jobs", async(req, res)=>{
  const cursor = jobsCollections.find();
  const result = await cursor.toArray();
  res.send(result)
})

//  client.db("admin").command({ ping: 1 });
//     console.log("Pinged your deployment. You successfully connected to MongoDB!");
app.get("/", (req, res)=>{
    res.send("job portal all jobs ")
})
app.listen(port,()=>{
    console.log(`job portal app listening on port:${port}`);  
})