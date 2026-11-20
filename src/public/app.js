document.addEventListener("DOMContentLoaded", () => {
  const searchForm = document.getElementById("airbnb-search-form");
  const cityInput = document.getElementById("city-input");
  const minPriceInput = document.getElementById("min-price");
  const maxPriceInput = document.getElementById("max-price");
  const listContainer = document.getElementById("airbnb-list");
  const heading = document.getElementById("destination-heading");
  const countText = document.getElementById("results-count-text");
  const healthPill = document.getElementById("health-pill");
  const healthText = document.getElementById("health-text");
  const categoryButtons = document.querySelectorAll(".category-item");

  // Verified high-resolution hotel photography
  const hotelPhotos = [
    "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=800&q=80",
  ];

  // Ratings table for realistic Airbnb star displays
  const ratings = ["4.98", "4.92", "4.89", "4.95", "4.87", "4.91"];

  // Fetch health check
  async function checkHealth() {
    try {
      const res = await fetch("/health");
      const data = await res.json();
      healthPill.className = `health-pill ${data.status.toLowerCase()}`;
      healthText.textContent = data.status;
    } catch {
      healthPill.className = "health-pill down";
      healthText.textContent = "DOWN";
    }
  }

  // Fetch and render hotels in a vertical list
  async function fetchHotels(city, minPrice, maxPrice) {
    listContainer.innerHTML = '<div class="empty-state">Searching best hotel offers across suppliers...</div>';
    heading.textContent = `Hotels in ${city.charAt(0).toUpperCase() + city.slice(1)}`;

    try {
      const params = new URLSearchParams({ city });
      if (minPrice) params.append("minPrice", minPrice);
      if (maxPrice) params.append("maxPrice", maxPrice);

      const res = await fetch(`/api/hotels?${params.toString()}`);
      if (!res.ok) {
        const errorData = await res.json();
        listContainer.innerHTML = `<div class="empty-state">Error: ${errorData.message || "Failed to load hotels"}</div>`;
        return;
      }

      const hotels = await res.json();
      countText.textContent = `${hotels.length} best-priced stays found · Deduplicated & price-optimized`;

      if (hotels.length === 0) {
        listContainer.innerHTML = '<div class="empty-state">No hotel listings found for this destination and price range.</div>';
        return;
      }

      listContainer.innerHTML = hotels
        .map((hotel, index) => {
          const photo = hotelPhotos[index % hotelPhotos.length];
          const rating = ratings[index % ratings.length];

          return `
            <div class="airbnb-list-card">
              <!-- Left: Photo Container -->
              <div class="card-visual">
                <img
                  src="${photo}"
                  alt="${hotel.name}"
                  class="card-img"
                  loading="lazy"
                  onerror="this.src='https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80'"
                />
                <span class="guest-favorite-badge">Guest favorite</span>
                <button class="heart-button" aria-label="Save to wishlist">
                  <svg width="24" height="24" viewBox="0 0 32 32">
                    <path d="M16 28c7-4.73 14-10 14-17a6.98 6.98 0 0 0-7-7c-1.8 0-4.3 1.03-7 4-2.7-2.97-5.2-4-7-4a6.98 6.98 0 0 0-7 7c0 7 7 12.27 14 17z" />
                  </svg>
                </button>
              </div>

              <!-- Right: Content Column -->
              <div class="card-content">
                <div class="card-top">
                  <div>
                    <span class="hotel-category">Hotel in ${city.charAt(0).toUpperCase() + city.slice(1)}</span>
                    <h3 class="hotel-title">${hotel.name}</h3>
                  </div>
                  <div class="hotel-rating">
                    <span>★</span>
                    <span>${rating}</span>
                  </div>
                </div>

                <div class="card-mid">
                  <div class="supplier-line">
                    <span>Lowest offer via</span>
                    <span class="supplier-highlight">${hotel.supplier}</span>
                  </div>
                  <div class="commission-line">
                    <span>${hotel.commissionPct}% partner commission rate</span>
                  </div>
                </div>

                <div class="card-bottom">
                  <span class="cheapest-guarantee">Best Price Selected</span>
                  <div class="price-box">
                    <span class="price-bold">₹${hotel.price.toLocaleString("en-IN")}</span>
                    <span class="price-period"> night</span>
                  </div>
                </div>
              </div>
            </div>
          `;
        })
        .join("");
    } catch (err) {
      listContainer.innerHTML = `<div class="empty-state">Network error: ${err.message}</div>`;
    }
  }

  // Search submission
  searchForm.addEventListener("submit", (e) => {
    e.preventDefault();
    fetchHotels(cityInput.value.trim(), minPriceInput.value, maxPriceInput.value);
  });

  // Category buttons
  categoryButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      categoryButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const targetCity = btn.getAttribute("data-city");
      cityInput.value = targetCity;
      fetchHotels(targetCity, minPriceInput.value, maxPriceInput.value);
    });
  });

  // Initial setup
  checkHealth();
  fetchHotels("delhi");
});
