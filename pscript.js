document.addEventListener("DOMContentLoaded", async function () {
  console.log("Initializing Firebase and Supabase...");

  const response = await fetch("env.json");
  const env = await response.json();

  // Firebase setup
  const firebaseConfig = {
    apiKey: env.FIREBASE_API_KEY,
    authDomain: env.FIREBASE_AUTH_DOMAIN,
    projectId: env.FIREBASE_PROJECT_ID,
    storageBucket: env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.FIREBASE_MESSAGING_SENDER_ID,
    appId: env.FIREBASE_APP_ID,
  };
  firebase.initializeApp(firebaseConfig);
  const db = firebase.firestore();
  const storage = firebase.storage();

  // Supabase setup
  const SUPABASE_URL = env.SUPABASE_URL;
  const SUPABASE_KEY = env.SUPABASE_ANON_KEY;

  // Cloudinary setup
  const CLOUD_NAME = env.Cloud_Name;
  const UPLOAD_PRESET = env.Upload_Preset;

  // Upload image to Cloudinary
  async function uploadToCloudinary(file) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/dkux9iebb/image/upload`,
      {
        method: "POST",
        body: formData,
      }
    );
    const data = await response.json();

    if (data.secure_url) {
      return data.secure_url; // Cloudinary URL of the uploaded image
    } else {
      console.error("Error uploading image to Cloudinary");
      return null;
    }
  }

  const urlParams = new URLSearchParams(window.location.search);
  const product_id = urlParams.get("id");

  async function loadProduct() {
    if (!product_id) return;

    const doc = await db.collection("products").doc(product_id).get();
    if (!doc.exists) return;

    const data = doc.data();
    document.getElementById("product-title").textContent = data.title;
    document.getElementById("price").textContent = `$${data.price}`;
    document.getElementById("availability").textContent =
      data.stock === "Available" ? "In Stock" : "Out of Stock";
    document.getElementById("description").textContent = data.description;

    // Share on WhatsApp button logic
document.getElementById("share-whatsapp").addEventListener("click", function () {
  const productTitle = data.title;
  const productLink = `${window.location.origin}${window.location.pathname}?id=${product_id}`;
  const message = `Check out this product: *${productTitle}* - ${productLink}`;
  const encodedMessage = encodeURIComponent(message);
  window.location.href = `https://wa.me/?text=${encodedMessage}`;
});

const price = parseFloat(data.price); // original price
const discount = parseFloat(data.discount) || 0;
const finalPrice = Math.round(price - (price * discount / 100));

document.getElementById("price").textContent = `₹${finalPrice}`;

if (discount > 0) {
  document.getElementById("original-price").textContent = `₹${price}`;
  document.getElementById("discount").textContent = `${discount}% off`;
  document.getElementById("original-price").style.display = "inline";
  document.getElementById("discount").style.display = "inline";
} else {
  document.getElementById("original-price").style.display = "none";
  document.getElementById("discount").style.display = "none";
}



    const featureList = document.getElementById("feature-list");
if (data.features && data.features.trim() !== "") {
  featureList.innerHTML = data.features;  // direct HTML insert
} else {
  featureList.innerHTML = "<li>No features listed</li>";
}

    if (data.imageUrls && data.imageUrls.length > 0) {
      const mainImage = document.getElementById("main-image");
      const mainImageLink = document.getElementById("main-image-link");
      mainImage.src = data.imageUrls[0];
      mainImageLink.href = data.imageUrls[0];

      const thumbnails = document.getElementById("image-thumbnails");
      thumbnails.innerHTML = "";
      data.imageUrls.forEach((img) => {
        const thumb = document.createElement("img");
        thumb.src = img;
        thumb.className = "thumbnail";
        thumb.onclick = () => {
          mainImage.src = img;
          mainImageLink.href = img;
        };
        thumbnails.appendChild(thumb);
      });
    }

    // Load existing reviews (if any)
    loadReviews();
  }

  // Add Buy Now button logic
  document.getElementById("buy-now").addEventListener("click", function () {
    const productTitle = data.title;
    const productLink = `${window.location.origin}${window.location.pathname}?id=${product_id}`;
    const message = `I want to order *${productTitle}*. Here is the product link: ${productLink}`;
    const encodedMessage = encodeURIComponent(message);
    window.location.href = `https://wa.me/9999999999?text=${encodedMessage}`;
  });

  //reviews section
  async function loadReviews() {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/Reviews?product_id=eq.${product_id}&select=*`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      }
    );
    const reviews = await response.json();
    const reviewsDiv = document.getElementById("reviews");
    reviewsDiv.innerHTML = "";

    if (reviews.length > 0) {
      let avg = (
        reviews.reduce((a, b) => a + b.rating, 0) / reviews.length
      ).toFixed(1);
      document.getElementById(
        "product-rating"
      ).innerHTML = `Rating: <span class="stars">${renderStars(avg)}</span> (${
        reviews.length
      } reviews)`;

      reviews.forEach((r) => {
        const div = document.createElement("div");
        div.className = "review";

        // Format name: feedback
        div.innerHTML = `<strong>${r.user_name}</strong>: ${r.feedback}`;

        // Display rating
        div.innerHTML += `<br><span class="rating">${renderStars(
          r.rating
        )}</span>`;

        // Display images if available
        if (r.image_urls && r.image_urls.length > 0) {
          r.image_urls.forEach((img) => {
            const imgTag = `<br> <a href="${img}" data-lightbox="review"><img src="${img}" style="width: 80px; height: 80px; margin-top: 5px;"></a>`;
            div.innerHTML += imgTag;
          });
        }

        reviewsDiv.appendChild(div);
      });
    } else {
      document.getElementById("product-rating").innerHTML = "No ratings yet.";
    }
  }

  function renderStars(rating) {
    const fullStars = Math.floor(rating);
    const halfStars = rating % 1 >= 0.5 ? 1 : 0;
    const emptyStars = 5 - fullStars - halfStars;

    return (
      "★".repeat(fullStars) + (halfStars ? "☆" : "") + "☆".repeat(emptyStars)
    );
  }

  loadProduct();
});
