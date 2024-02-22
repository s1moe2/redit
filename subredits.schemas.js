const Joi = require("joi");

const newPost = Joi.object({
  title: Joi.string().min(3),
  content: Joi.string().min(10),
});

const newSubredit = Joi.object({
  name: Joi.string().min(5).max(20),
  description: Joi.string().max(100),
}).unknown();

const newComment = Joi.object({
  content: Joi.string().min(5),
});

const postUpdate = Joi.object({
  content: Joi.string().min(10),
});

module.exports = {
  newPost,
  newSubredit,
  newComment,
  postUpdate,
};
