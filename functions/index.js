// const {onDocumentCreated} = require("firebase-functions/v2/firestore");
const functions = require("firebase-functions");

const admin = require("firebase-admin");
admin.initializeApp();

const db = admin.firestore();

exports.onPostCreated = functions.firestore
    .document("posts/{postId}")
    .onCreate(async (event) => {
      const snapshot = event.data;
      if (!snapshot) {
        console.log("No data associated with the event");
        return;
      }

      const postData = snapshot.data();
      const postTitle = postData.title;

      if (!postTitle) {
        console.log("Post title is missing!");
        return;
      }

      try {
        const titleCountRef = db.collection("postsCounts").doc(postTitle);

        const docSnapshot = await titleCountRef.get();
        if (!docSnapshot.exists) {
          await titleCountRef.set({
            totalPosts: 1,
            title: postTitle,
          });
          console.log(`postsCounts document created with title: ${postTitle}`);
        } else {
          // If the document exists, increment the count
          const docSnap = await titleCountRef.get();
          const totalPosts = docSnap.data().totalPosts;
          await titleCountRef.update({
            totalPosts: totalPosts + 1,
          });
          console.log(`count for title: ${postTitle} incremented`);
        }
      } catch (error) {
        console.error("Error updating postsCounts document: ", error);
      }
    });

exports.createPost = functions.https.onRequest(async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).send({error: "Method not allowed!"});
  }

  const {title, description} = req.body;
  if (!title || !description) {
    return res.status(400).send({error: "title/description required!"});
  }

  try {
    const newPostRef = await db.collection("posts").add({
      "title": title,
      "description": description,
      "Creation Date": new Date().toISOString(),
    });

    return res.status(201).send({postId: newPostRef.id});
  } catch (error) {
    console.error("Error creating new post: ", error);
    return res.status(500).send({error: "Failed to create post"});
  }
});

exports.getPosts = functions.https.onRequest(async (req, res) => {
  if (req.method !== "GET") {
    return res.status(405).send({error: "Method not allowed!"});
  }

  try {
    const postsRef = await db.collection("posts").get();
    if (postsRef.empty) {
      return res.status(200).send({posts: []});
    }

    const posts = [];
    postsRef.forEach((doc) => {
      posts.push({...doc.data()});
    });

    return res.status(200).send({posts: posts});
  } catch (error) {
    console.error("Error getting posts: ", error);
    return res.status(500).send({error: "Failed to get posts"});
  }
});

exports.getPost = functions.https.onRequest(async (req, res) => {
  if (req.method !== "GET") {
    return res.status(405).send({error: "Method not allowed!"});
  }

  try {
    const postId = req.params[0].replace("/", "");
    const postRef = db.collection("posts").doc(postId);
    const postSnapshot = await postRef.get();
    if (!postSnapshot.exists) {
      return res.status(404).send({error: "Post not found"});
    }
    return res.status(200).send({post: postSnapshot.data()});
  } catch (error) {
    console.error("Error getting post: ", error);
    return res.status(500).send({error: "Failed to get post"});
  }
});

exports.updatePost = functions.https.onRequest(async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).send({error: "Method not allowed!"});
  }

  const {title, description} = req.body;
  if (!title && !description) {
    return res.status(400).send({error: "provide title or description!"});
  }

  try {
    const postId = req.params[0].replace("/", "");
    const postRef = db.collection("posts").doc(postId);
    const postSnapshot = await postRef.get();

    if (!postSnapshot.exists) {
      return res.status(404).send({error: "Post not found"});
    }
    // update post
    const updates = {};
    if (title) updates.title = title;
    if (description) updates.description = description;

    await postRef.update(updates);
    const updatedSnap = await postRef.get();
    return res.status(200).send({...updatedSnap.data()});
  } catch (error) {
    console.error("Error getting posts: ", error);
    return res.status(500).send({error: "Failed to update post"});
  }
});
