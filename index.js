require("dotenv").config();
const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");
const Joi = require("joi");

let db;
const dbClient = new MongoClient(process.env.DB_URL);
const subreditsCollection = "subredits";
const postsCollection = "posts";

const app = express();
app.use(express.json());

const newSubredit = Joi.object({
  name: Joi.string().min(5).max(20),
  description: Joi.string().max(100),
}).unknown();

function findSubreditById(id) {
  return db.collection(subreditsCollection).findOne({ _id: id });
}

function findPostById(id) {
  return db.collection(postsCollection).findOne({ _id: id });
}

app.post("/subredits", async (req, res) => {
  const { error, value } = newSubredit.validate(req.body);
  if (error) {
    return res.status(400).json(error.details);
  }

  const insertRes = await db.collection(subreditsCollection).insertOne(value);

  const result = await findSubreditById(insertRes.insertedId);

  res.status(201).json(result);
});

const newPost = Joi.object({
  title: Joi.string().min(3),
  content: Joi.string().min(10),
});

app.post("/subredits/:id/posts", async (req, res) => {
  const { error, value } = newPost.validate(req.body);
  if (error) {
    return res.status(400).json(error.details);
  }

  const subredit = await findSubreditById(new ObjectId(req.params.id));
  if (!subredit) {
    return res.status(404).json({
      error: "subredit not found",
    });
  }

  const insertRes = await db.collection(postsCollection).insertOne({
    title: value.title, //req.body.title
    content: value.content,
    subreditId: subredit._id,
  });

  const insertedPost = await db
    .collection(postsCollection)
    .findOne({ _id: insertRes.insertedId });

  res.status(201).json({
    _id: insertRes.insertedId,
    title: insertedPost.title,
  });
});

app.get("/subredits/:id/posts", async (req, res) => {
  const posts = await db
    .collection(postsCollection)
    .find({ subreditId: new ObjectId(req.params.id) })
    .toArray();

  res.status(200).json(posts);
});

const newComment = Joi.Schema({
  content: Joi.string().min(5),
});

app.post("/subredits/:id/posts/:pid/comments", async (req, res) => {
  const { error, value } = newComment.validate(req.body);
  if (error) {
    return res.status(400).json(error.details);
  }

  const post = await db.collection(postsCollection).findOne({
    _id: new ObjectId(req.params.pid),
    subreditId: new ObjectId(req.params.id),
  });
  if (!post) {
    return res.status(404).json({
      error: "post not found",
    });
  }

  await db.collection(postsCollection).updateOne(
    {
      _id: new ObjectId(req.params.pid),
    },
    {
      $push: {
        comments: value.content,
      },
    }
  );

  const updatedPost = await findPostById(post._id);

  res.status(200).json(updatedPost);
});

const postUpdate = Joi.object({
  content: Joi.string().min(10),
});

app.put("/subredits/:id/posts/:pid", async (req, res) => {
  const { error, value } = postUpdate.validate(req.body);
  if (error) {
    return res.status(400).json(error.details);
  }

  const post = await db.collection(postsCollection).findOne({
    _id: new ObjectId(req.params.pid),
    subreditId: new ObjectId(req.params.id),
  });
  if (!post) {
    return res.status(404).json({
      error: "post not found",
    });
  }

  await db.collection(postsCollection).updateOne(
    {
      _id: new ObjectId(req.params.pid),
    },
    {
      $set: {
        content: value.content,
      },
    }
  );

  const updatedPost = await findPostById(post._id);

  res.status(200).json(updatedPost);
});

async function start() {
  const conn = await dbClient.connect();
  db = conn.db(process.env.DB_NAME);

  app.listen(3000, () => {
    console.log("ok");
  });
}

start()
  .then(() => console.log("server is running"))
  .catch((err) => console.log(err));
