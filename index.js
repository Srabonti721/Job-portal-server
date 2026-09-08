const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser")
const port = process.env.PORT || 5000;

app.use(cors({
    origin:['http://localhost:5173'],
    credentials: true
}));
app.use(express.json());
app.use(cookieParser())

const logger = (req, res, next) =>{
    console.log("inside logger middleware ");
    next()
    
}

const verifyToken = (req, res, next) =>{
    const token = req?.cookies?.token;
    console.log("cookie in the middleware",token);
    if(!token){
        return res.send.status(401).send({message: "unauthrized access"});
    }
    // verify token
    jwt.verify(token, process.env.jwt_ACCESS_SECRET, (err, decoded) =>{
        if(err){
           return res.send.status(401).send({message:"unauthrized access"})
        }
        req.decoded = decoded;
        next(); 
    })
    
}

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

    // jwt related web token
    app.post("/jwt", async(req, res)=>{
        const userData = req.body;
        const token = jwt.sign(userData, process.env.jwt_ACCESS_SECRET, {expiresIn:"1d"});

        // send token in the cookie
        res.cookie("token", token,{
                httpOnly:true,
                secure:false
        })
        res.send({success:true})
    })


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

app.get('/jobs/applications', async(req, res)=>{
const email = req.query.email;
const query = {hr_email: email};
const jobs = await jobsCollections.find(query).toArray();
for(const job of jobs){
    const applicationQuery = {jobId : job._id.toString()};
    const applicationCount = await applicationsCollection.countDocuments(applicationQuery);
    job.applicationCount = applicationCount
}
res.send(jobs)
})

app.post("/jobs", async(req, res)=>{
    const newJob = req.body;
    const result = await jobsCollections.insertOne(newJob);
    res.send(result)
})



// applications api

app.get("/applications",logger,verifyToken, async (req, res) => {
    const email = req.query.email;

    // console.log("inside application api :", req.cookies);
    if(email !== req.decoded.email ){
return res.status(403).send({message :"forbidden access"})
    }
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
