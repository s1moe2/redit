# Redit API

Start server with `npm run dev`.

TODO:

- [ ] install "mongodb"
- [ ] initialize connection to mongodb

- [ ] implement endpoint to create a subredit/community
      path: /subredits
      method: POST
      body: {
      name
      description
      }

- [ ] implement endpoint to create a post (in a subredit)
      path: /subredits/:id/posts
      method: POST
      body: c

- [ ] implement endpoint to list a subredit's posts
      path: /subredits/:id/posts
      method: GET

- [ ] implement endpoint to get the comments for a post
      path: /subredits/:id/posts/:pid/comments
      method: GET

- [ ] implement endpoint to edit a post
      path: /subredits/:id/posts/:pid
      method: PUT
      body: {
      title
      content
      }
