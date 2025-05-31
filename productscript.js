document.addEventListener("DOMContentLoaded", async function () {
    console.log("Initializing Firebase...");
  
    const response = await fetch("env.json");
    const env = await response.json();
  
    const firebaseConfig = {
        apiKey: env.FIREBASE_API_KEY,
        authDomain: env.FIREBASE_AUTH_DOMAIN,
        projectId: env.FIREBASE_PROJECT_ID,
        storageBucket: env.FIREBASE_STORAGE_BUCKET,
        messagingSenderId: env.FIREBASE_MESSAGING_SENDER_ID,
        appId: env.FIREBASE_APP_ID
    };
  
    // Initialize Firebase
    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();
  
    // Get product ID from URL query string
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get("id");
  
    // Function to load product data from Firestore
    async function loadProduct() {
        if (!productId) return;  // Exit if no product ID is provided
  
        const doc = await db.collection("products").doc(productId).get();
        if (!doc.exists) return;  // Exit if no document is found for the provided product ID
  
        const data = doc.data();
  
        // Set Title
        document.getElementById("product-title").textContent = data.title;
  
        // Set Price, Discount
        document.getElementById("price").textContent = `$${data.price}`;
        if (data.originalPrice && data.originalPrice > data.price) {
            document.getElementById("original-price").textContent = `$${data.originalPrice}`;
            const discount = Math.round(((data.originalPrice - data.price) / data.originalPrice) * 100);
            document.getElementById("discount").textContent = `${discount}% off`;
        } else {
            document.getElementById("original-price").style.display = "none";
            document.getElementById("discount").style.display = "none";
        }
  
        // Set Availability
        document.getElementById("availability").textContent = data.stock === "Available" ? "In Stock" : "Out of Stock";
  
        // Seller Info
        document.getElementById("seller-info").textContent = `Sold by: ${data.seller || "Unknown Seller"}`;
  
        // Description
        document.getElementById("description").textContent = data.description;
  
        // Highlights (features list)
        const features = data.features || [];
        const featureList = document.getElementById("feature-list");
        features.forEach(f => {
            const li = document.createElement("li");
            li.textContent = f;
            featureList.appendChild(li);
        });
  
        // Images (main image and thumbnails)
        const mainImage = document.getElementById("main-image");
        const thumbnails = document.getElementById("image-thumbnails");
        if (data.imageUrls && data.imageUrls.length > 0) {
            mainImage.src = data.imageUrls[0];
            data.imageUrls.forEach(img => {
                const thumb = document.createElement("img");
                thumb.src = img;
                thumb.className = "thumbnail";
                thumb.onclick = () => mainImage.src = img;
                thumbnails.appendChild(thumb);
            });
        }
  
        // Reviews (customer reviews)
        const reviewsDiv = document.getElementById("reviews");
        const reviews = data.reviews || [];
        reviews.forEach(r => {
            const div = document.createElement("div");
            div.className = "review";
            div.innerHTML = `<strong>${r.user}</strong>: ${r.text} <br><span class="rating">${renderStars(r.rating)}</span>`;
            reviewsDiv.appendChild(div);
        });
  
        // Rating summary
        const ratingDiv = document.getElementById("product-rating");
        if (reviews.length > 0) {
            const avg = (reviews.reduce((a, b) => a + b.rating, 0) / reviews.length).toFixed(1);
            ratingDiv.innerHTML = `Rating: <span class="stars">${renderStars(avg)}</span> (${reviews.length} reviews)`;
        }
    }
  
    // Function to render stars for ratings
    function renderStars(rating) {
        const fullStars = Math.floor(rating);
        const halfStars = (rating % 1) >= 0.5 ? 1 : 0;
        const emptyStars = 5 - fullStars - halfStars;
  
        return `
            ${'★'.repeat(fullStars)}
            ${halfStars ? '☆' : ''}
            ${'☆'.repeat(emptyStars)}
        `;
    }
  
    // Function to add a new review
    async function addReview(event) {
        event.preventDefault();  // Prevent the default form submission behavior
  
        const userName = document.getElementById("user-name").value;
        const userFeedback = document.getElementById("user-feedback").value;
        const userRating = parseInt(document.getElementById("user-rating").value);
  
        if (!userName || !userFeedback || !userRating) {
            alert("Please fill out all fields.");
            return;
        }
  
        const review = {
            user: userName,
            text: userFeedback,
            rating: userRating
        };
  
        // Add review to Firebase
        await db.collection("products").doc(productId).update({
            reviews: firebase.firestore.FieldValue.arrayUnion(review)
        });
  
        // Reload product data to show the new review
        loadProduct();
    }
  
    // Submit review when button is clicked
    document.getElementById("submit-review").addEventListener("click", addReview);
  
    // Load product details on page load
    loadProduct();
  });
  