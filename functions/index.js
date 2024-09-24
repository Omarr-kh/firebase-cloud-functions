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
      title: title,
      description: description,
    });

    return res.status(201).send({postId: newPostRef.id});
  } catch (error) {
    console.error("Error creating new post: ", error);
    return res.status(500).send({error: "Failed to create post"});
  }
});
