const cart = [];
const favorites = [];
const books = [];
let currentUser = null;
 
function isAdminUser(user) {
  return user && user.email && user.email.toLowerCase() === 'admin@bookbazaar.com';
}

const API_BASE = 'http://127.0.0.1:5000';

// Cart functionality
function updateCart() {
  const cartItemsContainer = document.getElementById("cart-items");
  const cartTotal = document.getElementById("cart-total");
  const cartCount = document.getElementById("cart-count");

  if (cartCount) {
    cartCount.textContent = cart.length;
  }

  if (!cartItemsContainer || !cartTotal) {
    localStorage.setItem('cart', JSON.stringify(cart));
    return;
  }

  cartItemsContainer.innerHTML = "";
  let total = 0;
  cart.forEach((item, index) => {
    total += item.price;
    const div = document.createElement("div");
    div.className = "row-between";
    div.innerHTML = `
      <span>${item.title}</span>
      <span>₹${item.price}</span>
      <button onclick="removeFromCart(${index})">Remove</button>
    `;
    cartItemsContainer.appendChild(div);
  });
  cartTotal.textContent = `₹${total}`;
  localStorage.setItem('cart', JSON.stringify(cart));
}

// Make removeFromCart globally accessible
window.removeFromCart = function(index) {
  cart.splice(index, 1);
  updateCart();
};

// Add to cart event listeners
function setupCartButtons() {
  const addToCartButtons = document.querySelectorAll(".add-to-cart");
  if (addToCartButtons.length === 0) return;
  addToCartButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const title = btn.dataset.title;
      const price = parseInt(btn.dataset.price);
      cart.push({ title, price });
      updateCart();
      alert('Book added to cart!');
    });
  });
}

// Authentication functionality
const users = JSON.parse(localStorage.getItem('users')) || [];

// Login/Register tab switching
document.querySelectorAll('.tab-btn').forEach(button => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
    button.classList.add('active');
    const tabName = button.getAttribute('data-tab');
    document.getElementById(`${tabName}-form`).classList.add('active');
  });
});

// Register form submission
const registerForm = document.getElementById('register-form-element');
if (registerForm) {
  registerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm-password').value;

    if (password !== confirmPassword) {
      alert('Passwords do not match!');
      return;
    }
    fetch(`${API_BASE}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    }).then(async r => {
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        if (j && j.error === 'email_exists') alert('User with this email already exists!');
        else alert('Registration failed');
        return;
      }
      alert('Registration successful! Please login.');
      document.querySelector('[data-tab="login"]').click();
      registerForm.reset();
    }).catch(() => alert('Network error'));
  });
}

// Login form submission
const loginForm = document.getElementById('login-form-element');
if (loginForm) {
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    fetch(`${API_BASE}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    }).then(async r => {
      const j = await r.json().catch(() => null);
      if (!r.ok || !j || !j.user) {
        alert('Invalid email or password!');
        return;
      }
      currentUser = j.user;
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
      alert(`Welcome back, ${currentUser.name}!`);
      window.location.hash = '';
      updateAuthUI();
    }).catch(() => alert('Network error'));
  });
}

function updateAuthUI() {
  const authLink = document.querySelector('a[href="#auth"], a[href="INDEX.HTML#auth"]');
  if (!authLink) return;

  const uploadLink = document.createElement('a');
  uploadLink.href = '#upload-book';
  uploadLink.textContent = 'Upload Book';
  const adminLink = document.createElement('a');
  adminLink.href = 'admin.html';
  adminLink.textContent = 'Admin';

  if (currentUser) {
    authLink.textContent = `Logout (${currentUser.name})`;
    authLink.onclick = (e) => {
      e.preventDefault();
      logout();
    };
    if (!document.querySelector('nav a[href="#upload-book"]')) {
      authLink.parentNode.insertBefore(uploadLink, authLink.nextSibling);
    }
    // Show admin link for admin user
    if (isAdminUser(currentUser) && !document.querySelector('nav a[href="admin.html"]')) {
      authLink.parentNode.insertBefore(adminLink, authLink.nextSibling);
    }
  } else {
    authLink.textContent = 'Sign in';
    authLink.onclick = null;
    const existingUploadLink = document.querySelector('nav a[href="#upload-book"]');
    if (existingUploadLink) {
      existingUploadLink.remove();
    }
    const existingAdminLink = document.querySelector('nav a[href="admin.html"]');
    if (existingAdminLink) {
      existingAdminLink.remove();
    }
  }
}

function logout() {
  currentUser = null;
  localStorage.removeItem('currentUser');
  updateAuthUI();
  alert('You have been logged out.');
}

const bookUploadForm = document.getElementById('book-upload-form');
const imagePreview = document.getElementById('image-preview');
const bookCoverInput = document.getElementById('book-cover');

if (bookCoverInput) {
  bookCoverInput.addEventListener('change', function() {
    const file = this.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function(e) {
        imagePreview.innerHTML = `<img src="${e.target.result}" style="max-width: 100%; max-height: 200px;" />`;
      }
      reader.readAsDataURL(file);
    }
  });
}

if (bookUploadForm) {
  bookUploadForm.addEventListener('submit', function(e) {
    e.preventDefault();
    if (!currentUser) {
      alert('Please login to upload books');
      window.location.hash = '#auth';
      return;
    }
    const title = document.getElementById('book-title').value;
    const author = document.getElementById('book-author').value;
    const publisher = document.getElementById('book-publisher').value;
    const price = parseInt(document.getElementById('book-price').value);
    const discount = parseInt(document.getElementById('book-discount').value || 0);
    const description = document.getElementById('book-description').value;
    const coverFile = document.getElementById('book-cover').files[0];
    if (!coverFile) {
      alert('Please select a cover image');
      return;
    }
    const isbn = 'ISBN-' + Math.floor(Math.random() * 9000000000 + 1000000000);
    const reader = new FileReader();
    reader.onload = function(e) {
      const payload = {
        id: Date.now().toString(),
        title,
        author,
        publisher,
        price,
        discountPercentage: discount,
        discountedPrice: price - (price * discount / 100),
        description,
        coverImage: e.target.result,
        isbn,
        uploadedBy: currentUser.email
      };
      fetch(`${API_BASE}/api/books`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(async r => {
        const j = await r.json().catch(() => null);
        if (!r.ok) {
          alert('Upload failed');
          return;
        }
        bookUploadForm.reset();
        imagePreview.innerHTML = '';
        alert('Upload submitted for admin review. ISBN: ' + isbn);
        window.location.hash = '';
      }).catch(() => alert('Network error'));
    };
    reader.readAsDataURL(coverFile);
  });
}

function approveBook(bookId) {
  if (!currentUser || !isAdminUser(currentUser)) return;
  fetch(`${API_BASE}/api/books/${bookId}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ admin_email: currentUser.email })
  }).then(async r => {
    if (!r.ok) { alert('Approve failed'); return; }
    alert('Book approved and published.');
    if (window.location.pathname.includes('admin.html')) displayPendingBooks();
  }).catch(() => alert('Network error'));
}
function rejectBook(bookId) {
  if (!currentUser || !isAdminUser(currentUser)) return;
  const params = new URLSearchParams({ admin_email: currentUser.email });
  fetch(`${API_BASE}/api/books/${bookId}?${params.toString()}`, { method: 'DELETE' })
    .then(async r => {
      if (!r.ok) { alert('Reject failed'); return; }
      alert('Book rejected and removed.');
      if (window.location.pathname.includes('admin.html')) displayPendingBooks();
    }).catch(() => alert('Network error'));
}
window.approveBook = approveBook;
window.rejectBook = rejectBook;

function displayPendingBooks() {
  const container = document.getElementById('pending-books');
  if (!container) return;
  if (!currentUser || !isAdminUser(currentUser)) {
    container.innerHTML = '<p>Access denied. Admins only.</p>';
    return;
  }
  const params = new URLSearchParams({ admin_email: currentUser.email });
  fetch(`${API_BASE}/api/pending?${params.toString()}`)
    .then(r => r.json())
    .then(j => {
      const pending = (j && j.books) || [];
      if (pending.length === 0) {
        container.innerHTML = '<p>No pending uploads.</p>';
        return;
      }
      container.innerHTML = '';
      pending.forEach(book => {
        const card = document.createElement('article');
        card.className = 'card';
        card.innerHTML = `
      <img src="${book.coverImage}" alt="${book.title}" />
      <div class="p16">
        <h3>${book.title}</h3>
        <p class="muted">Author: ${book.author}</p>
        <p class="muted">ISBN: ${book.isbn}</p>
        <p class="muted">Uploader: ${book.uploadedBy}</p>
        <div class="row-between">
          <div>
            ${book.discountPercentage > 0 ? 
              `<span class="actual-price">Actual price: ₹${book.price}</span>
               <div><span class="discount-price">Discounted price: ₹${book.discountedPrice}</span></div>
               <span class="discount">Discount(${book.discountPercentage}% OFF)</span>` : 
              `<span>Price: ₹${book.price}</span>`
            }
          </div>
          <div class="row" style="gap:8px">
            <button class="btn" onclick="approveBook('${book.id}')">Approve</button>
            <button class="btn" style="background:#d9534f" onclick="rejectBook('${book.id}')">Reject</button>
          </div>
        </div>
      </div>
    `;
        container.appendChild(card);
      });
    }).catch(() => {
      container.innerHTML = '<p>Failed to load pending uploads.</p>';
    });
}

function toggleFavorite(bookId) {
  if (!currentUser) {
    alert('Please login to add favorites');
    window.location.hash = '#auth';
    return;
  }
  const index = favorites.findIndex(fav => fav.bookId === bookId && fav.userEmail === currentUser.email);
  if (index === -1) {
    favorites.push({ bookId, userEmail: currentUser.email, addedAt: new Date().toISOString() });
    alert('Added to favorites!');
  } else {
    favorites.splice(index, 1);
    alert('Removed from favorites!');
  }
  localStorage.setItem('favorites', JSON.stringify(favorites));
  if (window.location.pathname.includes('favorites.html')) {
    displayFavorites();
  }
}

function isBookFavorite(bookId) {
  return currentUser && favorites.some(fav => fav.bookId === bookId && fav.userEmail === currentUser.email);
}

// Display book details in modal
function showBookDetails(bookId) {
  let book = null;
  const render = (b) => {
    if (!b) return;
    const modalTitle = document.getElementById('modal-book-title');
    const modalContent = document.getElementById('book-detail-content');
    if (!modalTitle || !modalContent) {
      console.error('Modal elements not found. Make sure you are on a page with the book detail modal.');
      return;
    }
    modalTitle.textContent = b.title;
    const isFavorite = isBookFavorite(b.id);
    const favoriteClass = isFavorite ? 'favorite active' : 'favorite';
    const favoriteText = isFavorite ? 'Remove from Favorites' : 'Add to Favorites';
    modalContent.innerHTML = `
      <div class="modal-book-header">
        <img src="${b.coverImage}" alt="${b.title}" />
        <button class="${favoriteClass} modal-favorite" onclick="toggleFavorite('${b.id}')" title="${favoriteText}">❤️</button>
      </div>
      <p><strong>Author:</strong> ${b.author}</p>
      <p><strong>Publisher:</strong> ${b.publisher}</p>
      <p><strong>ISBN:</strong> ${b.isbn}</p>
      <p><strong>Price:</strong> ₹${b.discountPercentage > 0 ? 
        `${b.discountedPrice} (${b.discountPercentage}% discount from ₹${b.price})` : 
        b.price}</p>
      <h3>About this Book</h3>
      <p>${b.description || 'No description available.'}</p>
      <button class="btn add-to-cart mt-10" data-title="${b.title}" data-price="${b.discountPercentage > 0 ? b.discountedPrice : b.price}">Add to Cart</button>
    `;
    const addToCartBtn = modalContent.querySelector('.add-to-cart');
    if (addToCartBtn) {
      addToCartBtn.addEventListener('click', () => {
        const title = addToCartBtn.dataset.title;
        const price = parseInt(addToCartBtn.dataset.price);
        cart.push({ title, price });
        updateCart();
        alert('Book added to cart!');
      });
    }
    window.location.hash = 'book-detail-modal';
  };
  fetch(`${API_BASE}/api/books`)
    .then(r => r.json())
    .then(j => {
      const list = (j && j.books) || [];
      book = list.find(b => b.id === bookId);
      render(book);
    });
}

// Display books on homepage
function displayBooks() {
  const bookGrid = document.querySelector('.grid');
  if (!bookGrid) return;
  bookGrid.innerHTML = '';
  fetch(`${API_BASE}/api/books`)
    .then(r => r.json())
    .then(j => {
      const list = (j && j.books) || [];
      if (list.length === 0) {
        bookGrid.innerHTML = '<p>No books available. Be the first to upload a book!</p>';
        return;
      }
      list.forEach(book => {
        const isFavorite = isBookFavorite(book.id);
        const favoriteClass = isFavorite ? 'favorite active' : 'favorite';
        const bookCard = document.createElement('article');
        bookCard.className = 'card';
        bookCard.innerHTML = `
      <a href="javascript:void(0);" onclick="showBookDetails('${book.id}')"><img src="${book.coverImage}" alt="${book.title}" /></a>
      <div class="p16">
        <h3><a href="javascript:void(0);" onclick="showBookDetails('${book.id}')">${book.title}</a></h3>
        <p class="muted">Author name: ${book.author}</p>
        <p class="muted">ISBN: ${book.isbn}</p>
        <p class="muted">Publisher: ${book.publisher}</p>
        <div class="row-between">
          <div>
            ${book.discountPercentage > 0 ? 
              `<span class="actual-price">Actual price: ₹${book.price}</span>
               <div><span class="discount-price">Discounted price: ₹${book.discountedPrice}</span></div>
               <span class="discount">Discount(${book.discountPercentage}% OFF)</span>` : 
              `<span>Price: ₹${book.price}</span>`
            }
          </div>
          <button class="btn add-to-cart" data-title="${book.title}" data-price="${book.discountPercentage > 0 ? book.discountedPrice : book.price}">Add to Cart</button>
        </div>
        <button class="${favoriteClass}" onclick="toggleFavorite('${book.id}')">❤️</button>
      </div>
    `;
        bookGrid.appendChild(bookCard);
      });
      setupCartButtons();
    }).catch(() => {
      bookGrid.innerHTML = '<p>Failed to load books.</p>';
    });
}

// Display favorites
function displayFavorites() {
  const favoritesContainer = document.getElementById('favorites-container');
  if (!favoritesContainer) return;
  if (!currentUser) {
    favoritesContainer.innerHTML = '<p>Please <a href="index.html#auth">login</a> to view your favorites.</p>';
    return;
  }
  const userFavorites = favorites.filter(fav => fav.userEmail === currentUser.email);
  if (userFavorites.length === 0) {
    favoritesContainer.innerHTML = '<p>You have no favorite books yet.</p>';
    return;
  }
  const savedBooks = JSON.parse(localStorage.getItem('books')) || [];
  favoritesContainer.innerHTML = '<h1>Your Favorite Books</h1><div class="grid" id="favorites-grid"></div>';
  const favoritesGrid = document.getElementById('favorites-grid');
  if (!favoritesGrid) {
    console.error('Could not find favorites-grid element');
    return;
  }
  userFavorites.forEach(favorite => {
    const book = savedBooks.find(b => b.id === favorite.bookId);
    if (!book) return;
    const bookCard = document.createElement('article');
    bookCard.className = 'card';
    bookCard.innerHTML = `
      <a href="javascript:void(0);" onclick="showBookDetails('${book.id}')"><img src="${book.coverImage}" alt="${book.title}" /></a>
      <div class="p16">
        <h3><a href="javascript:void(0);" onclick="showBookDetails('${book.id}')">${book.title}</a></h3>
        <p class="muted">Author name: ${book.author}</p>
        <p class="muted">ISBN: ${book.isbn}</p>
        <p class="muted">Publisher: ${book.publisher}</p>
        <div class="row-between">
          <div>
            ${book.discountPercentage > 0 ? 
              `<span class="actual-price">Actual price: ₹${book.price}</span>
               <div><span class="discount-price">Discounted price: ₹${book.discountedPrice}</span></div>
               <span class="discount">Discount(${book.discountPercentage}% OFF)</span>` : 
              `<span>Price: ₹${book.price}</span>`
            }
          </div>
          <button class="btn add-to-cart" data-title="${book.title}" data-price="${book.discountPercentage > 0 ? book.discountedPrice : book.price}">Add to Cart</button>
        </div>
        <button class="favorite active" onclick="toggleFavorite('${book.id}')">❤️</button>
      </div>
    `;
    favoritesGrid.appendChild(bookCard);
  });
  setupCartButtons();
}

// Initialize the application
function init() {
  const savedBooks = JSON.parse(localStorage.getItem('books')) || [];
  books.push(...savedBooks);
  const savedFavorites = JSON.parse(localStorage.getItem('favorites')) || [];
  favorites.push(...savedFavorites);
  const savedCart = JSON.parse(localStorage.getItem('cart')) || [];
  cart.push(...savedCart);
  const savedUser = JSON.parse(localStorage.getItem('currentUser'));
  if (savedUser) {
    currentUser = savedUser;
  }
  updateAuthUI();
  if (window.location.pathname.includes('home.html') || window.location.pathname.includes('INDEX.HTML') || window.location.pathname.endsWith('/')) {
    displayBooks();
  }
  if (window.location.pathname.includes('favorites.html')) {
    displayFavorites();
  }
  if (window.location.pathname.includes('admin.html')) {
    displayPendingBooks();
  }
  setupCartButtons();
  updateCart();
}
document.addEventListener('DOMContentLoaded', init);