document.addEventListener("DOMContentLoaded", async function () {
    const productContainer = document.getElementById("product-container");


    let products = [];
    let filteredProducts = [];
    let currentPage = 1;
    const productsPerPage = 10;
    
    async function loadCarouselImages() {
  try {
    const db = firebase.firestore();
    const snapshot = await db.collection("settings").doc("carousel").get();
    const carouselDiv = document.getElementById("carousel-images");

    if (snapshot.exists) {
      const data = snapshot.data();
      const images = data.images || [];

      if (images.length === 0) {
        document.getElementById("main-carousel").style.display = "none";
        return;
      }

      images.forEach((url, index) => {
        const div = document.createElement("div");
        div.className = `carousel-item ${index === 0 ? "active" : ""}`;
        div.innerHTML = `<img src="${url}" class="d-block w-100" alt="Carousel Image ${index + 1}">`;
        carouselDiv.appendChild(div);
      });

      document.getElementById("main-carousel").style.display = "block";
    }
  } catch (error) {
    console.error("Error loading carousel images:", error);
    document.getElementById("main-carousel").style.display = "none";
  }
}


    async function fetchProducts() {
        try {
            const response = await fetch("https://firestore.googleapis.com/v1/projects/yogeshwar-traders/databases/(default)/documents/products");
            const data = await response.json();

            if (!data.documents) {
                console.error("No products found.");
                return;
            }

            products = data.documents.map(doc => {
                const fields = doc.fields;
                return {
                    id: doc.name.split("/").pop(),
                    title: fields.title.stringValue,
                    price: parseFloat(fields.price.stringValue),
                    discount: fields.discount.stringValue,
                    category: fields.category?.stringValue || "Uncategorized",
                    description: fields.description?.stringValue || "No description available",
                    imageUrls: fields.imageUrls
                        ? fields.imageUrls.arrayValue.values.map(val => val.stringValue)
                        : ["placeholder.jpg"]
                };
            });

            generateCategoryButtons(products);

            filteredProducts = [...products];
            displayProducts(filteredProducts);
            setupPagination(filteredProducts);
        } catch (error) {
            console.error("Error fetching products:", error);
        }
    }

    function displayProducts(productsToDisplay) {
        productContainer.innerHTML = "";
        productsToDisplay.forEach(product => {
            const hasDiscount = product.discount && parseFloat(product.discount) > 0;
            const originalPrice = hasDiscount ? (product.price / (1 - (product.discount / 100))).toFixed(0) : null;

            const productHTML = `
                <div class="product-card-wrapper" onclick="window.location.href='product.html?id=${product.id}'">
                    <div class="product-card">
                        <img src="${product.imageUrls[0]}" alt="${product.title}" class="product-image">
                        <div class="product-details">
                            <h5 class="product-title">${product.title}</h5>
                            <p class="product-desc">${product.description}</p>
                            <div class="product-price">
                                <span class="current-price">₹${product.price}</span>
                                ${hasDiscount ? `<span class="original-price">₹${originalPrice}</span><span class="discount">(${product.discount}% OFF)</span>` : ""}
                            </div>
                            <div class="rating">⭐️⭐️⭐️⭐️☆</div>
                            <a href="https://wa.me/xxxxxxxxxx?text=I want to order ${product.title}" class="btn btn-success mt-2">Order Now</a>
                        </div>
                    </div>
                </div>
            `;
            productContainer.innerHTML += productHTML;
        });
    }

    // category btn function
    function generateCategoryButtons(products) {
  const buttonContainer = document.getElementById("category-buttons");
  const uniqueCategories = [...new Set(products.map(p => p.category))];

  buttonContainer.innerHTML = ""; // clear old buttons

  uniqueCategories.forEach(category => {
    const btn = document.createElement("button");
    btn.textContent = category;
    btn.addEventListener("click", () => {
      filteredProducts = products.filter(p => p.category === category);
      currentPage = 1;
      setupPagination(filteredProducts);
      paginate(filteredProducts);
    });
    buttonContainer.appendChild(btn);
  });

  // Add "All" button
  const allBtn = document.createElement("button");
  allBtn.textContent = "All";
  allBtn.addEventListener("click", () => {
    filteredProducts = [...products];
    currentPage = 1;
    setupPagination(filteredProducts);
    paginate(filteredProducts);
  });
  buttonContainer.prepend(allBtn);
}


    function setupPagination(productsToPaginate) {
        const totalPages = Math.ceil(productsToPaginate.length / productsPerPage);
        const paginationContainer = document.getElementById("pagination-container");
        paginationContainer.innerHTML = "";

        for (let i = 1; i <= totalPages; i++) {
            const pageButton = document.createElement("button");
            pageButton.classList.add("page-btn");
            pageButton.textContent = i;
            pageButton.addEventListener("click", () => {
                currentPage = i;
                paginate(productsToPaginate);
            });
            paginationContainer.appendChild(pageButton);
        }
    }

    function paginate(productsToPaginate) {
        const startIndex = (currentPage - 1) * productsPerPage;
        const endIndex = startIndex + productsPerPage;
        const productsToDisplay = productsToPaginate.slice(startIndex, endIndex);
        displayProducts(productsToDisplay);
    }

    


    fetchProducts();

    // Admin logo double-click login
    let logo = document.getElementById("admin-logo");
    if (logo) {
        logo.addEventListener("dblclick", function () {
            window.location.href = "login.html";
        });
    }

    // Banner
    try {
        const response = await fetch("env.json");
        const env = await response.json();

        const firebaseConfig = {
            apiKey: env.FIREBASE_API_KEY,
            authDomain: env.FIREBASE_AUTH_DOMAIN,
            projectId: env.FIREBASE_PROJECT_ID,
        };
        firebase.initializeApp(firebaseConfig);
        const db = firebase.firestore();

        loadCarouselImages();
    } catch (e) {
        console.error("Failed to load env.json or Firebase setup:", e);
    }
});
