const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
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
    },
});
client.connect().catch(console.dir);
const jobsCollections = client.db("JobPortal").collection("Jobs");
const applicationsCollection = client
    .db("JobPortal")
    .collection("applications");

// jobs api
app.get("/jobs", async (req, res) => {
    const email = req.query.email;
    const query ={};
    if(email){
        query.hr_email = email
    }
    const cursor = jobsCollections.find(query);
    const result = await cursor.toArray();
    res.send(result);
});

app.get("/jobs/:id", async (req, res) => {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const result = await jobsCollections.findOne(query);
    res.send(result);
});

app.post("/jobs", async(req, res)=>{
    const newJob = req.body;
    const result = await jobsCollections.insertOne(newJob);
    res.send(result)
})

// applications api

app.get("/applications", async (req, res) => {
    const email = req.query.email;
    const query = {
        applicant:email,
    };
    const result = await applicationsCollection.find(query).toArray();

    for(const application of result){
        const jobID = application.jobID; 
        const jobQuery = {_id: new ObjectId(jobID)}
        const job = await jobsCollections.findOne(jobQuery);  
        application.company = job.company
        application.title = job.title
        application.company_logo = job.company_logo
    }
    res.send(result)
});

app.get("/applications/job/:job_id", async(req, res)=>{
const job_id = req.params.job_id;
const query = {jobID : job_id};
const result = await applicationsCollection.find(query).toArray();
res.send(result);
})

app.post("/applications", async (req, res) => {
    const application = req.body;
    const result = await applicationsCollection.insertOne(application);
    res.send(result);
});

app.patch('/applications/:id', async(req, res)=>{
    const id = req.params.id;
    const filter = {_id: new ObjectId(id)};
    const updatedDoc = {
        $set:{
            status: req.body.status
        }
    }
    const result = await applicationsCollection.updateOne(filter, updatedDoc);
    res.send(result);
})

app.get("/", (req, res) => {
    res.send("job portal all jobs ");
});
app.listen(port, () => {
    console.log(`job portal app listening on port:${port}`);
});
