require("dotenv").config();
const express = require("express");
const { MongoClient } = require("mongodb");
const app = express();
const joi = require("joi");

app.use(express.json());

const url = DB_URL;
const client = new MongoClient(url);
const dbName = "Cluster0";
let db;

// schema
const subreditsSchema = joi.object({
  name: joi.string().required(),
  description: joi.string(),
});

app.post("/subredits", async (req, res) => {
  const { value, error } = subreditsSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details });
  }

  const collection = await db
    .collection("subreditCollection")
    .insertMany([value]);

  res.status(201).json("created");
});

app.post("/subredits/:subredditName/posts", async (req, res) => {
  const subredditName = req.params.subredditName; // Corrected typo in param name

  // Validate the post data
  const { value, error } = subreditsSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details });
  }

  const post = { ...value, subreddit: subredditName };
  const result = await db.collection("postsCollection").insertOne(post);

  if (result) {
    res.status(201).json({ message: "Post created" });
  } else {
    res.status(500).json({ message: "Error creating post" });
  }
});

module.exports = app;

// retorna as postagens
app.get("/subredits/:subredditName/posts", async (req, res) => {
  const subredditName = req.params.subredditName;

  try {
    const posts = await db
      .collection("postsCollection")
      .find({ subreddit: subredditName })
      .toArray();

    if (!posts || posts.length === 0) {
      return res
        .status(404)
        .json({ error: "No posts found for this subreddit" });
    }

    res.json(posts);
  } catch (error) {
    console.error("Error fetching posts:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

const Joi = require("joi");

const updatePostSchema = Joi.object({
  title: Joi.string().optional(),
  content: Joi.string().optional(),
});

app.put("/subredits/:subredditName/posts/:postId", async (req, res) => {
  const subredditName = req.params.subredditName;
  const postId = req.params.postId;

  // Convert the string ID to an ObjectId for querying
  const objectId = new ObjectId(postId);

  // Validate the request body against the schema
  const { value, error } = updatePostSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details });
  }

  // Construct the update document
  const updateDocument = {
    $set: value,
  };

  // Perform the update operation
  try {
    const result = await db
      .collection("postsCollection")
      .updateOne({ _id: objectId, subreddit: subredditName }, updateDocument);

    // Check if the update was successful
    if (result.matchedCount > 0) {
      res.status(200).json({ message: "Post updated successfully." });
    } else {
      res.status(404).json({ message: "Post not found." });
    }
  } catch (err) {
    // Handle any errors that occurred during the update
    console.error("Error updating post:", err);
    res
      .status(500)
      .json({ message: "An error occurred while updating the post." });
  }
});

async function start(app) {
  await client.connect();
  console.log("Connected successfully to server");
  db = client.db(dbName);

  app.listen(process.env.PORT, () => {
    console.log("server is running (express)");
  });
}

start(app)
  .then(() => console.log("start routine complete"))
  .catch((err) => console.log("star routine error: ", err));
