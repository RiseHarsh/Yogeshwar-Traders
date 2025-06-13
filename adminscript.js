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
    appId: env.FIREBASE_APP_ID,
  };

  firebase.initializeApp(firebaseConfig);
  const auth = firebase.auth();
  const db = firebase.firestore();

  // Supabase setup
  const SUPABASE_URL = env.SUPABASE_URL;
  const SUPABASE_KEY = env.SUPABASE_ANON_KEY;

  // Cloudinary setup
  const CLOUD_NAME = env.Cloud_Name;
  const UPLOAD_PRESET = env.Upload_Preset; // yt_preset (products)
  const UPLOAD_PRESET_1 = env.Upload_Preset_1; // user_review_upload
  const UPLOAD_PRESET_2 = env.Upload_Preset_2; // sales_banner

  auth.onAuthStateChanged((user) => {
    if (!user) {
      alert("You must be logged in to access the admin panel.");
      window.location.href = "index.html";
    }
  });

  // ✅ Logout
  window.logout = function () {
    auth.signOut().then(() => {
      window.location.href = "index.html";
    });
  };

  // ✅ Cloudinary Upload with Custom Preset
  async function uploadToCloudinary(image, preset) {
    const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

    const formData = new FormData();
    formData.append("file", image);
    formData.append("upload_preset", preset);

    const response = await fetch(CLOUDINARY_URL, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Cloudinary image upload failed!");
    }

    const data = await response.json();
    return data.secure_url;
  }

  // ✅ Add Product
  // Initialize Quill for Key Features
const quillFeatures = new Quill("#quillFeatures", {
  theme: "snow",
  placeholder: "Enter key features (e.g., bullet points)...",
});

let editingProductId = null; // Track product ID if editing

// ✅ Handle Add/Edit Product Form Submission
document.getElementById("productForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  const title = document.getElementById("productTitle").value;
  const description = document.getElementById("productDescription").value;
  const price = parseFloat(document.getElementById("productPrice").value);
  const discount = parseFloat(document.getElementById("productDiscount").value || 0);
  const stock = document.getElementById("productStock").value;
  const category = document.getElementById("productCategory").value;
  const featuresHTML = quillFeatures.root.innerHTML;
  const images = document.getElementById("productImages").files;

  let imageUrls = [];

  // Upload new images if selected
  if (images.length > 0) {
    for (const image of images) {
      try {
        const imageUrl = await uploadToCloudinary(image, UPLOAD_PRESET);
        imageUrls.push(imageUrl);
      } catch (error) {
        console.error("Image upload failed:", error);
        alert("❌ Failed to upload image. Try again.");
        return;
      }
    }
  }

  const productData = {
    title,
    description,
    category,
    price,
    discount,
    stock,
    features: featuresHTML,
    date: new Date().toISOString(),
  };

  if (imageUrls.length > 0) {
    productData.imageUrls = imageUrls;
  }

  try {
    if (editingProductId) {
      // Update existing product
      await db.collection("products").doc(editingProductId).update(productData);
      alert("✅ Product updated!");
    } else {
      // Add new product
      productData.imageUrls = imageUrls;
      await db.collection("products").add(productData);
      alert("✅ Product added!");
    }
  } catch (err) {
    console.error("Error saving product:", err);
    alert("❌ Failed to save product.");
  }

  resetProductForm();
  loadProducts();
});

// ✅ Reset Form After Submission or Cancel
// function resetProductForm() {
//   document.getElementById("productForm").reset();
//   quillFeatures.root.innerHTML = "";
//   document.getElementById("formTitle").textContent = "Add Product";
//   document.getElementById("formSubmitBtn").textContent = "Post Product";
//   editingProductId = null;
// }

function resetProductForm() {
  document.getElementById("productForm").reset();
  quillFeatures.root.innerHTML = "";
  document.getElementById("formTitle").textContent = "Add Product";
  document.getElementById("formSubmitBtn").textContent = "Post Product";
  editingProductId = null;
  loadAdminReviews(); // ✅ Add this if reviews need to be refreshed
}


// ✅ Load Product Data into Form for Editing
window.editProduct = async function (id) {
  try {
    const doc = await db.collection("products").doc(id).get();
    if (!doc.exists) {
      alert("❌ Product not found!");
      return;
    }

    const product = doc.data();
    editingProductId = id;

    // Pre-fill form fields
    document.getElementById("productTitle").value = product.title || "";
    document.getElementById("productDescription").value = product.description || "";
    document.getElementById("productCategory").value = product.category || "";
    document.getElementById("productPrice").value = product.price || "";
    document.getElementById("productDiscount").value = product.discount || "";
    document.getElementById("productStock").value = product.stock || "Available";
    quillFeatures.root.innerHTML = product.features || "";

    // Change form UI for edit mode
    document.getElementById("formTitle").textContent = "Edit Product";
    document.getElementById("formSubmitBtn").textContent = "Update Product";

    // Show the Add Product section if hidden
    showSection("addProducts");

    alert("✏️ Now editing. Make changes and submit to update.");
  } catch (err) {
    console.error("Edit error:", err);
    alert("❌ Failed to load product for editing.");
  }
  // Optional: Remove required from image input while editing
document.getElementById("productImages").removeAttribute("required");

};


// Load Products into Table
async function loadProducts() {
  const productsTable = document.getElementById("productsTable");
  productsTable.innerHTML = "";

  const snapshot = await db.collection("products").get();
  if (!snapshot || snapshot.empty) {
    console.warn("No products found.");
    return;
  }

  snapshot.forEach((doc) => {
    const product = doc.data();
    const docId = doc.id;
    const stockBadge = product.stock === "Available" ? "✅ In Stock" : "❌ Out of Stock";

    const imagesHTML = product.imageUrls
      ? product.imageUrls.map((url) => `<img src="${url}" width="50" height="50">`).join(" ")
      : "No Image";

    const featuresHTML = product.features || "<i>No features listed</i>";

    productsTable.innerHTML += `
      <tr>
          <td>${product.title}</td>
          <td>
            ${product.description}
            <div><strong>Key Features:</strong><br>${featuresHTML}</div>
          </td>
          <td>${product.category}</td>
          <td>${product.price}</td>
          <td>${product.discount ? product.discount + "%" : "N/A"}</td>
          <td>${stockBadge}</td>
          <td>${imagesHTML}</td>
          <td>
              <button onclick="editProduct('${docId}')">✏️ Edit</button>
              <button onclick="deleteProduct('${docId}')">🗑 Delete</button>
          </td>
      </tr>`;
  });
}

  // ✅ Delete Product
  window.deleteProduct = async function (id) {
    if (confirm("Are you sure you want to delete this product?")) {
      await db.collection("products").doc(id).delete();
      alert("✅ Product deleted!");
      loadProducts();
    }
  };

  // ✅ Edit Product
  // window.editProduct = async function (id) {
  //   const newTitle = prompt("Enter new product title:");
  //   if (newTitle) {
  //     await db.collection("products").doc(id).update({ title: newTitle });
  //     alert("✅ Product updated!");
  //     loadProducts();
  //   }
  // };

  loadProducts(); // Initial load

  // ✅ Load Admin Reviews
  async function loadAdminReviews() {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/Reviews?select=*`, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
    });

    const reviews = await response.json();

    const reviewsTableBody = document.getElementById("reviews-table-body");
    reviewsTableBody.innerHTML = "";

    if (reviews.length === 0) {
      reviewsTableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;">No reviews available.</td></tr>`;
      return;
    }

    reviews.forEach((r) => {
      const tr = document.createElement("tr");

      const productTitle = r.product_title || "Unknown Product";
      const tdProduct = document.createElement("td");
      tdProduct.textContent = productTitle;
      tr.appendChild(tdProduct);

      const tdUser = document.createElement("td");
      tdUser.textContent = r.user_name;
      tr.appendChild(tdUser);

      const tdFeedback = document.createElement("td");
      const shortFeedback =
        r.feedback.length > 50
          ? r.feedback.substring(0, 50) + "..."
          : r.feedback;
      tdFeedback.innerHTML = `${shortFeedback} ${
        r.feedback.length > 50
          ? `<a href="#" onclick="alert('${r.feedback.replace(
              /'/g,
              "\\'"
            )}')">Read More</a>`
          : ""
      }`;
      tr.appendChild(tdFeedback);

      const tdRating = document.createElement("td");
      tdRating.innerHTML = renderStars(r.rating);
      tr.appendChild(tdRating);

      const tdImages = document.createElement("td");
      if (r.image_urls && r.image_urls.length > 0) {
        r.image_urls.forEach((imgUrl) => {
          const imgLink = document.createElement("a");
          imgLink.href = imgUrl;
          imgLink.setAttribute("data-lightbox", "review-images");
          imgLink.innerHTML = `<img src="${imgUrl}" style="width:40px; height:40px; margin:2px;">`;
          tdImages.appendChild(imgLink);
        });
      } else {
        tdImages.textContent = "No images";
      }
      tr.appendChild(tdImages);

      const tdDate = document.createElement("td");
      tdDate.textContent = new Date(r.created_at).toLocaleDateString();
      tr.appendChild(tdDate);

      const tdActions = document.createElement("td");
      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "Delete";
      deleteBtn.className = "delete-btn";
      deleteBtn.onclick = () => deleteReview(r.id);
      tdActions.appendChild(deleteBtn);
      tr.appendChild(tdActions);

      reviewsTableBody.appendChild(tr);
    });
  }

  async function deleteReview(reviewId) {
    if (!confirm("Are you sure you want to delete this review?")) return;

    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/Reviews?id=eq.${reviewId}`,
        {
          method: "DELETE",
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
          },
        }
      );

      if (response.ok) {
        alert("Review deleted successfully!");
        loadAdminReviews();
      } else {
        const result = await response.json();
        console.error("Error deleting review:", result);
        alert("Error deleting review!");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("An error occurred while deleting the review.");
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

  // ✅ Sales Banner
  const bannerForm = document.getElementById("bannerForm");

  async function loadBannerSettings() {
    try {
      const bannerDoc = await db
        .collection("settings")
        .doc("salesBanner")
        .get();
      if (bannerDoc.exists) {
        const data = bannerDoc.data();
        document.getElementById("bannerStatus").value = data.status
          ? "enabled"
          : "disabled";
      }
    } catch (err) {
      console.warn("Couldn't fetch existing banner settings:", err);
    }
  }

  loadBannerSettings();

  if (bannerForm) {
    bannerForm.addEventListener("submit", async function (e) {
      e.preventDefault();

      const status = document.getElementById("bannerStatus").value;
      const imageFile = document.getElementById("bannerImage").files[0];

      let imageUrl = "";

      if (imageFile) {
        try {
          imageUrl = await uploadToCloudinary(imageFile, UPLOAD_PRESET_2); // Use sales_banner preset
        } catch (error) {
          alert("❌ Banner image upload failed.");
          return;
        }
      }

      const bannerData = {
        status: status === "enabled",
      };

      if (imageUrl) {
        bannerData.imageUrl = imageUrl;
      }

      try {
        await db
          .collection("settings")
          .doc("salesBanner")
          .set(bannerData, { merge: true });
        alert("✅ Sales banner updated successfully!");
      } catch (err) {
        console.error("Error saving banner settings:", err);
        alert("❌ Failed to update sales banner.");
      }
    });
  }

  // ✅ Section Switching
  window.showSection = function (sectionId) {
    document.querySelectorAll("main section").forEach((section) => {
      section.classList.add("hidden");
    });
    document.getElementById(sectionId).classList.remove("hidden");
  };
});


function toggleSidebar() {
  const sidebar = document.querySelector(".sidebar");
  sidebar.classList.toggle("show");

  // Optional: Close when clicking outside on mobile
  document.body.addEventListener("click", function closeSidebar(e) {
    if (!sidebar.contains(e.target) && !e.target.classList.contains('menu-toggle')) {
      sidebar.classList.remove("show");
      document.body.removeEventListener("click", closeSidebar);
    }
  });
}
