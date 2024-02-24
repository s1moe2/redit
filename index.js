require("dotenv").config();
const express = require("express");
const bcrypt = require("bcrypt");
const Joi = require("joi");
const jwt = require("jsonwebtoken");
const uuid = require("uuid");
const mongoDB = require("./db");
const middleware = require("./middleware");
const subredits = require("./subredits.handlers");

const usersCollection = "users";

const app = express();
app.use(express.json());

app.post("/login", async (req, res) => {
  const db = await mongoDB.getDb();
  const user = await db.collection(usersCollection).findOne({
    username: req.body.username,
  });
  if (!user) {
    return res.status(401).json({ result: "unauthorized" });
  }

  if (!user.verified) {
    return res.status(401).json({ result: "unauthorized" });
  }

  const validPassword = await bcrypt.compare(req.body.password, user.password);
  if (!validPassword) {
    return res.status(401).json({ result: "unauthorized" });
  }

  const payload = {
    userId: user._id,
  };
  const options = {
    expiresIn: "1h",
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET, options);

  res.status(200).json({ result: "ok", token });
});

const signupSchema = Joi.object({
  name: Joi.string().min(3),
  email: Joi.string().email(),
  password: Joi.string().alphanum().min(8),
  username: Joi.string().min(3).max(24),
});

// captcha
app.post("/signup", async (req, res) => {
  const db = await mongoDB.getDb();

  const { error, value } = signupSchema.validate(req.body);
  if (error) {
    return res.status(400).json(error.details);
  }

  // check user exists
  const user = await db.collection("users").findOne({
    username: req.body.username,
  });
  if (user) {
    return res.status(400).json({ result: "username already exists" });
  }

  // generate verification code
  const verificationCode = uuid.v4();

  // hash password
  const passwordHash = await bcrypt.hash(req.body.password, 10);

  const newUser = {
    ...req.body,
    verificationCode,
  };
  newUser.password = passwordHash;

  await db.collection(usersCollection).insertOne(newUser);
  // insert user { name, email, username, passwordHash, code, verified(false) }

  // send verification email (code)
  //          assumption: user goes on app, submits code

  res.status(200).json({});
});

app.post("/verification", async (req, res) => {
  const user = await db.collection("users").findOne({
    code: req.body.code,
    verified: false,
  });
  if (!user) {
    return res.status(400).json({ result: "invalid code" });
  }

  await db.collection("users").updateOne(
    {
      _id: user._id,
    },
    {
      $set: {
        verified: true,
      },
    }
  );

  res.status(204);
});

const recoverSchema = Joi.object({
  username: Joi.string().min(3).max(24),
});

// recover password
app.put("/recover", async (req, res) => {
  const db = await mongoDB.getDb();

  const { error, value } = recoverSchema.validate(req.body);
  if (error) {
    return res.status(400).json(error.details);
  }

  const user = await db.collection("users").findOne({
    username: req.body.username,
  });
  if (!user) {
    return res.status(204).end();
  }

  const recoveryCode = uuid.v4();
  await db.collection("users").updateOne(
    {
      _id: user._id,
    },
    {
      $set: {
        recoveryCode,
      },
    }
  );

  // send email (user.email, recoveryCode)

  res.status(204).end();
});

const passwordSchema = Joi.object({
  password: Joi.string().alphanum().min(8).required(),
  code: Joi.string().uuid().required(),
});

app.put("/password", async (req, res) => {
  const db = await mongoDB.getDb();

  const { error, value } = passwordSchema.validate(req.body);
  if (error) {
    return res.status(400).json(error.details);
  }

  const passwordHash = await bcrypt.hash(value.password, 10);

  const updResult = await db.collection("users").updateOne(
    {
      recoveryCode: value.code,
    },
    {
      $set: {
        password: passwordHash,
        recoveryCode: null,
      },
    }
  );
  if (!updResult.matchedCount) {
    return res.status(400).json({ error: "invalid code" });
  }

  res.status(204).end();
});

app.use(middleware.auth, subredits);

app.listen(3000, () => {
  console.log("server is running...");
});
