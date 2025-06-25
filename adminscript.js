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
  const UPLOAD_PRESET_2 = env.Upload_Preset_2; // carousel-img

  auth.onAuthStateChanged((user) => {
    if (!user) {
      alert("You must be logged in to access the admin panel.");
      window.location.href = "index.html";
    } else {
      showSection('existingProducts'); // Show products section by default
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
  document
    .getElementById("productForm")
    .addEventListener("submit", async function (e) {
      e.preventDefault();

      const title = document.getElementById("productTitle").value;
      const description = document.getElementById("productDescription").value;
      const price = parseFloat(document.getElementById("productPrice").value);
      let discount = parseFloat(
        document.getElementById("productDiscount").value || 0
      );
      if (discount < 0 || discount > 100) {
        alert("❌ Discount must be between 0% and 100%.");
        return;
      }

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
          await db
            .collection("products")
            .doc(editingProductId)
            .update(productData);
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
  // cancel btn

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
      document.getElementById("productDescription").value =
        product.description || "";
      document.getElementById("productCategory").value = product.category || "";
      document.getElementById("productPrice").value = product.price || "";
      document.getElementById("productDiscount").value = product.discount || "";
      document.getElementById("productStock").value =
        product.stock || "Available";
      quillFeatures.root.innerHTML = product.features || "";

      // Change form UI for edit mode
      document.getElementById("formTitle").textContent = "Edit Product";
      document.getElementById("formSubmitBtn").textContent = "Update Product";
      document
        .getElementById("cancelEditBtn")
        .addEventListener("click", resetProductForm);

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
  // window.handleSidebarClick = function (sectionId) {
  //   showSection(sectionId);
  //   // Auto-hide sidebar on mobile
  //   const sidebar = document.querySelector(".sidebar");
  //   if (window.innerWidth <= 768) {
  //     sidebar.classList.remove("show");
  //   }
  window.handleSidebarClick = function (sectionId) {
  showSection(sectionId);

  // Load reviews only when "Ratings & Reviews" is clicked
  if (sectionId === "ratingsReviews") {
    loadAdminReviews();
  }

  // Auto-hide sidebar on mobile
  const sidebar = document.querySelector(".sidebar");
  if (window.innerWidth <= 768) {
    sidebar.classList.remove("show");
  }


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
      const stockBadge =
        product.stock === "Available" ? "✅ In Stock" : "❌ Out of Stock";

      const imagesHTML = product.imageUrls
        ? product.imageUrls
            .map((url) => `<img src="${url}" width="50" height="50">`)
            .join(" ")
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
  <button onclick="prefillReview('${product.title}')">➕ Add Review</button>
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

  for (const r of reviews) {
    const tr = document.createElement("tr");

    // ✅ Product title from Firestore using product_id
    const tdProduct = document.createElement("td");
    try {
      const productDoc = await db.collection("products").doc(r.product_id).get();
      if (productDoc.exists) {
        tdProduct.textContent = productDoc.data().title || "Untitled";
      } else {
        tdProduct.textContent = "Product Not Found";
      }
    } catch (error) {
      console.error("Error fetching product title:", error);
      tdProduct.textContent = "Error";
    }
    tr.appendChild(tdProduct);

    const tdUser = document.createElement("td");
    tdUser.textContent = r.user_name;
    tr.appendChild(tdUser);

    const tdFeedback = document.createElement("td");
    const shortFeedback = r.feedback.length > 50
      ? r.feedback.substring(0, 50) + "..."
      : r.feedback;
    tdFeedback.innerHTML = `${shortFeedback} ${
      r.feedback.length > 50
        ? `<a href="#" onclick="alert('${r.feedback.replace(/'/g, "\\'")}')">Read More</a>`
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
  }
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

  // adding review by admin
  const manualReviewForm = document.getElementById("manualReviewForm");

manualReviewForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const product_title = document.getElementById("reviewProduct").value.trim();
  const user_name = document.getElementById("reviewUser").value.trim();
  const rating = parseInt(document.getElementById("reviewRating").value);
  const feedback = document.getElementById("reviewFeedback").value.trim();
  const images = document.getElementById("reviewImages").files;

  if (!product_title || !user_name || !feedback || rating < 1 || rating > 5) {
    alert("Please fill in all required fields correctly.");
    return;
  }

  let image_urls = [];
  for (const file of images) {
    try {
      const url = await uploadToCloudinary(file, UPLOAD_PRESET_1);
      image_urls.push(url);
    } catch (err) {
      console.error("Image upload error:", err);
      alert("Image upload failed.");
      return;
    }
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/Reviews`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        product_title,
        user_name,
        rating,
        feedback,
        image_urls,
        created_at: new Date().toISOString(),
      }),
    });

    if (response.ok) {
      alert("✅ Review added!");
      manualReviewForm.reset();
      loadAdminReviews();
      showSection("ratingsReviews");
    } else {
      throw new Error("Failed to add review.");
    }
  } catch (err) {
    console.error("Review submit error:", err);
    alert("❌ Could not submit review.");
  }
});

window.prefillReview = function (productTitle) {
  showSection("addReview");
  document.getElementById("reviewProduct").value = productTitle;
};



// about us section
const aboutEditor = new Quill("#quillAboutUs", {
  theme: "snow",
  placeholder: "Write about your business here...",
});
const saveBtn = document.getElementById("saveAboutBtn");
const previewBtn = document.getElementById("previewAboutBtn");
const previewBox = document.getElementById("aboutPreview");
const previewContent = document.getElementById("aboutPreviewContent");

// Load About Us content from Firestore
async function loadAboutContent() {
  try {
    const doc = await db.collection("settings").doc("about_us").get();
    if (doc.exists) {
      aboutEditor.root.innerHTML = doc.data().content || "";
    }
  } catch (err) {
    console.error("Failed to load About Us:", err);
  }
}

// Save About Us content to Firestore
saveBtn.addEventListener("click", async () => {
  const content = aboutEditor.root.innerHTML;
  try {
    await db.collection("settings").doc("about_us").set({ content });
    alert("✅ About Us content saved!");
  } catch (err) {
    console.error("Save failed:", err);
    alert("❌ Failed to save About Us content.");
  }
});

// Preview About Us content
previewBtn.addEventListener("click", () => {
  const content = aboutEditor.root.innerHTML;
  previewContent.innerHTML = content;
  previewBox.classList.remove("hidden");
});

loadAboutContent(); // Call on page load
  

  // loadCarouselImages();
const carouselForm = document.getElementById("carouselForm");
const carouselPreview = document.getElementById("carouselPreview");
const saveCarouselOrderBtn = document.getElementById("saveCarouselOrder");

let carouselImages = []; // local preview state

async function loadCarouselImages() {
  try {
    const doc = await db.collection("settings").doc("carousel").get();
    if (doc.exists) {
      const data = doc.data();
      carouselImages = data.images || [];
      renderCarouselImages();
    }
  } catch (e) {
    console.error("Failed to load carousel images:", e);
  }
}

function renderCarouselImages() {
  carouselPreview.innerHTML = "";
  carouselImages.forEach((url, index) => {
    const wrapper = document.createElement("div");
    wrapper.className = "carousel-item-wrapper";
    wrapper.setAttribute("draggable", "true");
    wrapper.dataset.index = index;

    wrapper.innerHTML = `
      <img src="${url}" alt="carousel-img-${index}">
      <button onclick="deleteCarouselImage(${index})">✖</button>
    `;

    addDragEvents(wrapper);
    carouselPreview.appendChild(wrapper);
  });
}

window.deleteCarouselImage = function(index) {
  if (confirm("Delete this image from carousel?")) {
    carouselImages.splice(index, 1);
    renderCarouselImages();
  }
};

// ✅ Handle Upload
carouselForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const files = document.getElementById("carouselImages").files;
  if (files.length === 0) return alert("Select at least one image.");

  for (const file of files) {
    try {
      const url = await uploadToCloudinary(file, UPLOAD_PRESET_2); // using your `sales_banner` preset
      carouselImages.push(url);
    } catch (e) {
      console.error("Upload failed:", e);
    }
  }

  renderCarouselImages();
  document.getElementById("carouselImages").value = "";
});

// ✅ Save Carousel Order
saveCarouselOrderBtn.addEventListener("click", async () => {
  try {
    await db.collection("settings").doc("carousel").set({ images: carouselImages });
    alert("✅ Carousel updated successfully!");
  } catch (e) {
    console.error("Failed to save carousel:", e);
    alert("❌ Failed to save carousel.");
  }
});

// ✅ Drag & Drop Reordering
let dragSrcEl = null;

function addDragEvents(elem) {
  elem.addEventListener("dragstart", (e) => {
    dragSrcEl = e.currentTarget;
    e.dataTransfer.effectAllowed = "move";
  });

  elem.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  });

  elem.addEventListener("drop", (e) => {
    e.preventDefault();
    const from = parseInt(dragSrcEl.dataset.index);
    const to = parseInt(e.currentTarget.dataset.index);
    if (from !== to) {
      const [moved] = carouselImages.splice(from, 1);
      carouselImages.splice(to, 0, moved);
      renderCarouselImages();
    }
  });
}

// Load initially
loadCarouselImages();

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
    if (
      !sidebar.contains(e.target) &&
      !e.target.classList.contains("menu-toggle")
    ) {
      sidebar.classList.remove("show");
      document.body.removeEventListener("click", closeSidebar);
    }
  });
}
window.toggleSidebar = function () {
  const sidebar = document.querySelector(".sidebar");
  sidebar.classList.toggle("show");
};
