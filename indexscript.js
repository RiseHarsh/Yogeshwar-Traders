document.addEventListener("DOMContentLoaded", async function () {
    const productContainer = document.getElementById("product-container");
    const searchBox = document.getElementById("searchBox");
    const categoryFilter = document.getElementById("categoryFilter");
    const priceFilter = document.getElementById("priceFilter");

    let products = [];
    let filteredProducts = [];
    let currentPage = 1;
    const productsPerPage = 10;

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

            populateCategoryFilter(products);
            filteredProducts = [...products];
            displayProducts(filteredProducts);
            setupPagination(filteredProducts);
        } catch (error) {
            console.error("Error fetching products:", error);
        }
    }

    function populateCategoryFilter(products) {
        const categorySet = new Set();

        products.forEach(product => {
            if (product.category) {
                categorySet.add(product.category);
            }
        });

        categoryFilter.innerHTML = '<option value="">All Categories</option>';

        Array.from(categorySet).sort().forEach(category => {
            const option = document.createElement("option");
            option.value = category;
            option.textContent = category;
            categoryFilter.appendChild(option);
        });
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

    searchBox.addEventListener("input", function () {
        const searchText = searchBox.value.toLowerCase();
        filteredProducts = products.filter(product =>
            product.title.toLowerCase().includes(searchText)
        );
        setupPagination(filteredProducts);
        paginate(filteredProducts);
    });

    categoryFilter.addEventListener("change", function () {
        const category = categoryFilter.value;
        filteredProducts = products.filter(product =>
            category === "" || product.category === category
        );
        setupPagination(filteredProducts);
        paginate(filteredProducts);
    });

    priceFilter.addEventListener("change", function () {
        const sortOrder = priceFilter.value;
        if (sortOrder === "low") {
            filteredProducts.sort((a, b) => a.price - b.price);
        } else if (sortOrder === "high") {
            filteredProducts.sort((a, b) => b.price - a.price);
        }
        setupPagination(filteredProducts);
        paginate(filteredProducts);
    });

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

        const salesBanner = document.getElementById("sales-banner");
        const salesBannerImg = document.getElementById("sales-banner-img");

        async function checkSalesBannerStatus() {
            try {
                const doc = await db.collection("settings").doc("salesBanner").get();
                if (doc.exists) {
                    const data = doc.data();
                    if (data.status && data.imageUrl) {
                        salesBannerImg.src = data.imageUrl;
                        salesBanner.style.display = 'block';
                    } else {
                        salesBanner.style.display = 'none';
                    }
                } else {
                    console.warn("No sales banner config found.");
                    salesBanner.style.display = 'none';
                }
            } catch (error) {
                console.error("Error fetching sales banner data:", error);
                salesBanner.style.display = 'none';
            }
        }

        checkSalesBannerStatus();
    } catch (e) {
        console.error("Failed to load env.json or Firebase setup:", e);
    }
});
