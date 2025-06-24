
    document.addEventListener("DOMContentLoaded", async function () {
      const aboutUsDiv = document.getElementById("aboutUsText");
      try {
        const res = await fetch("env.json");
        const env = await res.json();
        const firebaseConfig = {
          apiKey: env.FIREBASE_API_KEY,
          authDomain: env.FIREBASE_AUTH_DOMAIN,
          projectId: env.FIREBASE_PROJECT_ID
        };
        firebase.initializeApp(firebaseConfig);
        const db = firebase.firestore();

        const doc = await db.collection("settings").doc("about_us").get();
        if (doc.exists && doc.data().content) {
          aboutUsDiv.innerHTML = doc.data().content;
        } else {
          aboutUsDiv.innerHTML = "<p>About Us content is not available.</p>";
        }
      } catch (err) {
        console.error("Error loading About Us:", err);
        aboutUsDiv.innerHTML = "<p>Error loading content.</p>";
      }
    });
  