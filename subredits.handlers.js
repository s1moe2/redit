const express = require("express");
const router = express.Router();
const schemas = require("./subredits.schemas.js");
const { getDb } = require("./db.js");
const { ObjectId } = require("mongodb");

const subreditsCollection = "subredits";
const postsCollection = "posts";

async function findSubreditById(id) {
  return (await getDb()).collection(subreditsCollection).findOne({ _id: id });
}

async function findPostById(id) {
  return (await getDb()).collection(postsCollection).findOne({ _id: id });
}

router.get("/subredits", async (req, res) => {
  const _db = await getDb();

  const subredits = await _db
    .collection(postsCollection)
    .aggregate([
      // since we have subredits in a different collection, we need to get them (posts are liked to subredits via subreditId field)
      {
        $lookup: {
          from: subreditsCollection,
          localField: "subreditId",
          foreignField: "_id",
          as: "subredit",
        },
      },
      // group posts by subredit to compute average likes (per subredit)
      { $group: { _id: "$subredit", avgLikes: { $avg: "$likes" } } },
    ])
    .sort({ avgLikes: -1 }) // sort by descending order
    .toArray();

  const result = subredits.map((sub) => ({
    id: sub._id[0]._id,
    name: sub._id[0].name,
    decription: sub._id[0].decription,
    avgLikes: sub.avgLikes,
  }));

  res.status(200).json(result);
});

router.post("/subredits", async (req, res) => {
  const { error, value } = schemas.newSubredit.validate(req.body);
  if (error) {
    return res.status(400).json(error.details);
  }

  const _db = await getDb();

  const insertRes = await _db.collection(subreditsCollection).insertOne(value);

  const result = await findSubreditById(insertRes.insertedId);

  res.status(201).json(result);
});

router.post("/subredits/:id/posts", async (req, res) => {
  const { error, value } = schemas.newPost.validate(req.body);
  if (error) {
    return res.status(400).json(error.details);
  }

  const _db = await getDb();

  const subredit = await findSubreditById(new ObjectId(req.params.id));
  if (!subredit) {
    return res.status(404).json({
      error: "subredit not found",
    });
  }

  const insertRes = await _db.collection(postsCollection).insertOne({
    title: value.title, //req.body.title
    content: value.content,
    subreditId: subredit._id,
  });

  const insertedPost = await _db
    .collection(postsCollection)
    .findOne({ _id: insertRes.insertedId });

  res.status(201).json({
    _id: insertRes.insertedId,
    title: insertedPost.title,
  });
});

router.get("/subredits/:id/posts", async (req, res) => {
  const _db = await getDb();
  const posts = await _db
    .collection(postsCollection)
    .find({ subreditId: new ObjectId(req.params.id) })
    .sort({ likes: -1 }) // sort by descending order
    .toArray();

  res.status(200).json(posts);
});

router.get("/subredits/:id/posts", async (req, res) => {
  const _db = await getDb();
  const posts = await _db
    .collection(postsCollection)
    .find({ subreditId: new ObjectId(req.params.id) })
    .sort({ likes: -1 }) // sort by descending order
    .toArray();

  res.status(200).json(posts);
});

router.post("/subredits/:id/posts/:pid/comments", async (req, res) => {
  const { error, value } = schemas.newComment.validate(req.body);
  if (error) {
    return res.status(400).json(error.details);
  }

  const post = await getDb()
    .collection(postsCollection)
    .findOne({
      _id: new ObjectId(req.params.pid),
      subreditId: new ObjectId(req.params.id),
    });
  if (!post) {
    return res.status(404).json({
      error: "post not found",
    });
  }

  await getDb()
    .collection(postsCollection)
    .updateOne(
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

router.put("/subredits/:id/posts/:pid", async (req, res) => {
  const { error, value } = schemas.postUpdate.validate(req.body);
  if (error) {
    return res.status(400).json(error.details);
  }

  const post = await getDb()
    .collection(postsCollection)
    .findOne({
      _id: new ObjectId(req.params.pid),
      subreditId: new ObjectId(req.params.id),
    });
  if (!post) {
    return res.status(404).json({
      error: "post not found",
    });
  }

  await getDb()
    .collection(postsCollection)
    .updateOne(
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

router.post("/subredits/:id/posts/:pid/like", async (req, res) => {
  const _db = await getDb();
  const updateResult = await _db.collection(postsCollection).updateOne(
    {
      _id: new ObjectId(req.params.pid),
      subreditId: new ObjectId(req.params.id),
    },
    {
      $inc: {
        likes: 1,
      },
    }
  );
  if (!updateResult.matchedCount) {
    return res.status(404).json({ error: "subredit/post not foudn" });
  }

  const updatedPost = await findPostById(new ObjectId(req.params.pid));

  res.status(200).json(updatedPost);
});

module.exports = router;
