const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const admin = require("firebase-admin");
const { getAuth } = require("firebase-admin/auth");
const serviceAccount = require("./firebase-admin-service-key.json");

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.efzq5bn.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
});

admin.initializeApp({
    credential: admin.cert(serviceAccount),
});
//
const verifyFirebaseToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).send({ message: "unauthorized access" });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = await getAuth().verifyIdToken(token);
        req.decoded = decoded;
        next();
    } catch (error) {
        res.status(401).send({ message: "unauthorized access" });
    }
};

//     const authHeader = req.headers.authorization;
//         // console.log("AUTH HEADER:", authHeader);

//     if (!authHeader || !authHeader.startsWith("Bearer ")) {
//         return res.status(401).send({ message: "unauthorized access" });
//     }

//     const token = authHeader.split(" ")[1];

//     try {
//         const decoded = await admin.auth().verifyIdToken(token);
//         req.decoded = decoded;
//         next();
//     } catch (error) {
//         res.status(401).send({ message: "unauthorized access" });
//     }
// };

client.connect().catch(console.dir);
const jobsCollection = client.db("JobPortal").collection("Jobs");
const applicationsCollection = client
    .db("JobPortal")
    .collection("applications");

// jobs api
app.get("/jobs", async (req, res) => {
    const email = req.query.email;
    const query = {};
    if (email) {
        query.hr_email = email;
    }

    const cursor = jobsCollection.find(query);
    const result = await cursor.toArray();
    res.send(result);
});

// could be done but should not be done.
// app.get('/jobsByEmailAddress', async (req, res) => {
//   const email = req.query.email;
//   const query = { hr_email: email }
//   const result = await jobsCollection.find(query).toArray();
//   res.send(result);
// })

app.get("/jobs/applications", verifyFirebaseToken, async (req, res) => {
    const email = req.query.email;
    const query = { hr_email: email };

    if(email !== req.decoded.email){
      return res.status(403).send({message:"forbidden access"})
    }

    const jobs = await jobsCollection.find(query).toArray();

    // should use aggregate to have optimum data fetching
    for (const job of jobs) {
        const applicationQuery = { jobId: job._id.toString() };
        const application_count =
            await applicationsCollection.countDocuments(applicationQuery);
        job.application_count = application_count;
    }
    res.send(jobs);
});

app.get("/jobs/:id", async (req, res) => {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const result = await jobsCollection.findOne(query);
    res.send(result);
});

app.post("/jobs", async (req, res) => {
    const newJob = req.body;
    console.log(newJob);
    const result = await jobsCollection.insertOne(newJob);
    res.send(result);
});

// job applications related apis
app.get("/applications", verifyFirebaseToken, async (req, res) => {
    const email = req.query.email;
    if (email !== req.decoded.email) {
        return res.status(403).send({ message: "forbbiden access" });
    }
    const query = {
        applicant: email,
    };
    const result = await applicationsCollection.find(query).toArray();

    // bad way to aggregate data
    for (const application of result) {
        // const jobId = application.jobId;
        const jobID = application.jobID;

        const jobQuery = { _id: new ObjectId(jobID) };
        const job = await jobsCollection.findOne(jobQuery);
        application.company = job.company;
        application.title = job.title;
        application.company_logo = job.company_logo;
    }
    res.send(result);
});

app.get("/applications/job/:job_id", async (req, res) => {
    const job_id = req.params.job_id;
    // console.log(job_id);
    const query = { jobId: job_id };
    const result = await applicationsCollection.find(query).toArray();
    res.send(result);
});

app.post("/applications", async (req, res) => {
    const application = req.body;
    console.log(application);
    const result = await applicationsCollection.insertOne(application);
    res.send(result);
});

app.patch("/applications/:id", async (req, res) => {
    const id = req.params.id;
    const filter = { _id: new ObjectId(id) };
    const updatedDoc = {
        $set: {
            status: req.body.status,
        },
    };

    const result = await applicationsCollection.updateOne(filter, updatedDoc);
    res.send(result);
});

app.get("/", (req, res) => {
    res.send("Career Code is Cookinggg");
});

app.listen(port, () => {
    console.log(`Career Code server is running on port ${port}`);
});


