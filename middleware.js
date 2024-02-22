const jwt = require("jsonwebtoken");

function auth(req, res, next) {
  const token = req.headers.authorization;
  if (!token) {
    return res.status(401).json({});
  }

  try {
    jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return res.status(401).json({});
  }

  next();
}

module.exports = {
  auth,
};
